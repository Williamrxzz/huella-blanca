-- PER04: "Está conmigo" no se frena por el límite de 10 minutos.
--
-- Al probar el límite de frecuencia (migración anterior) un aviso "Está
-- conmigo" quedó omitido por venir después de cuatro "La vi pasar": es el
-- aviso más importante (alguien tiene a la mascota ahora). Se marca como
-- prioritario: no lo frena el tope de 5 en 10 minutos, pero sí el de 12 por
-- hora, para que tampoco se pueda usar en bucle.

alter table public.notificaciones
  add column if not exists prioritaria boolean not null default false;

-- encolar_notificacion con un parámetro más (opcional)
drop function if exists public.encolar_notificacion(uuid, uuid, text, text, text, text);
create or replace function public.encolar_notificacion(
  p_perfil_id uuid, p_mascota_id uuid, p_tipo text, p_titulo text, p_cuerpo text, p_url text,
  p_prioritaria boolean default false
)
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.notificaciones (perfil_id, mascota_id, tipo, titulo, cuerpo, url, prioritaria)
  values (p_perfil_id, p_mascota_id, p_tipo, p_titulo, p_cuerpo, p_url, p_prioritaria)
$$;
revoke execute on function public.encolar_notificacion(uuid, uuid, text, text, text, text, boolean) from anon, authenticated, public;

create or replace function public.notificar_avistamiento()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_mascota mascotas%rowtype;
  v_caso    casos_perdida%rowtype;
  v_metros  double precision;
  v_dist    text;
  v_cuerpo  text;
begin
  select * into v_mascota from mascotas where id = new.mascota_id;
  if not found then return new; end if;

  if new.lat is not null and v_mascota.domicilio_lat is not null then
    v_metros := distancia_metros(new.lat, new.lng, v_mascota.domicilio_lat, v_mascota.domicilio_lng);
  end if;
  v_dist := distancia_legible(v_metros);

  v_cuerpo := case new.situacion
    when 'conmigo' then 'Está con la persona que avisó'
    when 'la_vi_pasar' then 'La vieron pasar'
    else 'Alguien avisó que la vio'
  end;
  if v_dist is not null then
    v_cuerpo := v_cuerpo || ', a ' || v_dist || ' de tu casa';
  end if;
  v_cuerpo := v_cuerpo || '.';

  -- Si el aviso abrió el caso en esta misma transacción, se dice acá y no en
  -- una segunda notificación.
  select * into v_caso from casos_perdida where id = new.caso_id;
  if v_caso.id is not null and v_caso.estado = 'posible_perdida' and v_caso.iniciado_en = now() then
    v_cuerpo := v_cuerpo || ' Confirmá o descartá la pérdida en el panel.';
  end if;

  perform encolar_notificacion(
    v_mascota.dueno_id, v_mascota.id, 'avistamiento',
    'Alguien vio a ' || v_mascota.nombre,
    v_cuerpo,
    '/mascotas/' || v_mascota.id || '/mapa',
    new.situacion = 'conmigo');

  return new;
end;
$$;

create or replace function public.limitar_notificacion_push()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ultima_enviada timestamptz;
  v_omitidas int;
  v_escaneos int;
  v_avisos int;
  v_extra text;
begin
  if new.tipo in ('posible_perdida', 'perdida_automatica') or new.mascota_id is null then
    return new;
  end if;

  -- "Enviada" = no omitida por este límite (incluye las que la Edge Function
  -- todavía no procesó). Las prioritarias ("Está conmigo") no las frena el
  -- tope de 10 minutos, solo el de la hora.
  if (new.tipo = 'escaneo' and exists (
        select 1 from notificaciones
         where mascota_id = new.mascota_id and tipo = 'escaneo'
           and creado_en > now() - interval '10 minutes'
           and (resultado is null or resultado->>'omitida' is null)))
     or (not new.prioritaria and (select count(*) from notificaciones
          where mascota_id = new.mascota_id
            and creado_en > now() - interval '10 minutes'
            and (resultado is null or resultado->>'omitida' is null)) >= 5)
     or (select count(*) from notificaciones
          where mascota_id = new.mascota_id
            and creado_en > now() - interval '1 hour'
            and (resultado is null or resultado->>'omitida' is null)) >= 12
  then
    new.resultado := jsonb_build_object('omitida', 'limite_frecuencia');
    new.enviada_en := null;
    return new;
  end if;

  -- Se manda: si desde el último push hubo omitidas, se cuentan en el texto.
  select max(creado_en) into v_ultima_enviada
    from notificaciones
   where mascota_id = new.mascota_id
     and (resultado is null or resultado->>'omitida' is null);

  select count(*) filter (where tipo = 'escaneo'),
         count(*) filter (where tipo = 'avistamiento'),
         count(*)
    into v_escaneos, v_avisos, v_omitidas
    from notificaciones
   where mascota_id = new.mascota_id
     and resultado->>'omitida' is not null
     and creado_en > coalesce(v_ultima_enviada, '-infinity'::timestamptz);

  if v_omitidas > 0 then
    v_extra := concat_ws(' y ',
      case when v_avisos = 1 then '1 aviso' when v_avisos > 1 then v_avisos || ' avisos' end,
      case when v_escaneos = 1 then '1 escaneo' when v_escaneos > 1 then v_escaneos || ' escaneos' end);
    new.cuerpo := new.cuerpo || ' Además: ' || v_extra || ' más. Mirá el mapa.';
    new.url := '/mascotas/' || new.mascota_id || '/mapa';
  end if;

  return new;
end;
$$;
