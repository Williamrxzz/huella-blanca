-- PER04: límite de frecuencia de los push al dueño (revisión del 2026-11-17).
--
-- `registrar_escaneo()` y `registrar_avistamiento()` son públicas (quien
-- encuentra la mascota no se registra) y el código de la placa está impreso en
-- el collar y en cada afiche compartido. Desde que existen los push, cualquiera
-- podía, con un script, mandarle al dueño decenas de notificaciones por minuto.
--
-- Criterio: los datos nunca se pierden (cada notificación queda en el
-- historial y cada aviso en el mapa); lo que se frena es el push.
--   * "Escanearon la placa": como mucho uno cada 10 minutos por mascota.
--   * Cualquier tipo: como mucho 5 push en 10 minutos y 12 en una hora por
--     mascota.
--   * "¿Está perdida?" y "pasó a perdida" no se frenan nunca: los genera el
--     sistema, una vez por caso (índice único de casos abiertos).
-- El siguiente push que sí sale suma "Además: N avisos más", para que el
-- dueño sepa que hay novedades que no le llegaron una por una.
-- Y un tope duro en los avisos: 20 por hora por mascota.

-- ---------------------------------------------------------------------------
-- 1. Antes de insertar: decidir si se manda y armar el resumen
-- ---------------------------------------------------------------------------
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
  -- todavía no procesó).
  if (new.tipo = 'escaneo' and exists (
        select 1 from notificaciones
         where mascota_id = new.mascota_id and tipo = 'escaneo'
           and creado_en > now() - interval '10 minutes'
           and (resultado is null or resultado->>'omitida' is null)))
     or (select count(*) from notificaciones
          where mascota_id = new.mascota_id
            and creado_en > now() - interval '10 minutes'
            and (resultado is null or resultado->>'omitida' is null)) >= 5
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

drop trigger if exists notificaciones_limitar on public.notificaciones;
create trigger notificaciones_limitar
  before insert on public.notificaciones
  for each row execute function public.limitar_notificacion_push();

-- ---------------------------------------------------------------------------
-- 2. Después de insertar: solo se llama a la Edge Function si no se omitió
-- ---------------------------------------------------------------------------
create or replace function public.enviar_notificacion_push()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'net', 'vault'
as $$
declare
  v_secreto text;
begin
  -- Omitida por el límite de frecuencia: queda en el historial, sin push.
  if new.resultado ? 'omitida' then
    return new;
  end if;

  select decrypted_secret into v_secreto
  from vault.decrypted_secrets
  where name = 'notificar_secret'
  limit 1;

  -- Sin secreto configurado no se intenta: la fila queda en la cola, visible.
  if v_secreto is null then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://pgnxanjiswmytdocdhuw.supabase.co/functions/v1/notificar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notificar-secret', v_secreto
    ),
    body    := jsonb_build_object('id', new.id),
    timeout_milliseconds := 15000
  );
  return new;
end;
$$;

create index if not exists notificaciones_mascota_fecha_idx
  on public.notificaciones (mascota_id, creado_en desc);

-- ---------------------------------------------------------------------------
-- 3. Tope duro de avisos: 20 por hora por mascota
-- ---------------------------------------------------------------------------
create or replace function public.registrar_avistamiento(
  p_codigo text,
  p_lat double precision,
  p_lng double precision,
  p_origen text default 'gps',
  p_situacion text default null,
  p_mensaje text default null,
  p_contacto text default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_mascota  mascotas%rowtype;
  v_caso_id  uuid;
  v_avist_id uuid;
  v_con_ubicacion boolean := p_lat is not null and p_lng is not null;
begin
  select m.* into v_mascota
  from placas p join mascotas m on m.id = p.mascota_id
  where p.codigo = p_codigo and p.estado = 'activa';
  if not found then
    return json_build_object('ok', false, 'motivo', 'placa_inexistente');
  end if;

  if not v_con_ubicacion and coalesce(btrim(p_mensaje), '') = '' then
    return json_build_object('ok', false, 'motivo', 'falta_lugar');
  end if;

  -- Un uso real (varias personas que la ven durante una búsqueda) queda muy
  -- lejos; solo frena a quien manda avisos en bucle.
  if (select count(*) from avistamientos
       where mascota_id = v_mascota.id
         and creado_en > now() - interval '1 hour') >= 20 then
    return json_build_object('ok', false, 'motivo', 'demasiados_avisos');
  end if;

  select id into v_caso_id
  from casos_perdida
  where mascota_id = v_mascota.id
    and estado in ('posible_perdida','perdida')
  limit 1;

  -- Un aviso deliberado abre caso aunque la mascota esté cerca de casa
  if v_caso_id is null then
    insert into casos_perdida (mascota_id, estado, origen, ultima_lat, ultima_lng)
    values (v_mascota.id, 'posible_perdida', 'automatico',
            case when v_con_ubicacion then p_lat end,
            case when v_con_ubicacion then p_lng end)
    returning id into v_caso_id;
  end if;

  insert into avistamientos
    (mascota_id, caso_id, lat, lng, origen, situacion, mensaje, contacto, reportado_por)
  values
    (v_mascota.id, v_caso_id,
     case when v_con_ubicacion then p_lat end,
     case when v_con_ubicacion then p_lng end,
     case when v_con_ubicacion then p_origen else 'manual' end,
     p_situacion, nullif(btrim(p_mensaje), ''), nullif(btrim(p_contacto), ''), auth.uid())
  returning id into v_avist_id;

  if v_con_ubicacion then
    update casos_perdida
       set ultima_lat = p_lat, ultima_lng = p_lng
     where id = v_caso_id;
  end if;

  return json_build_object('ok', true, 'avistamiento_id', v_avist_id, 'caso_id', v_caso_id);
end;
$function$;
