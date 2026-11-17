-- Revisión del 2026-11-17: dos datos que la ficha y las estadísticas contaban mal.
--
-- 1. PER03 b: cuando un caso pasa solo de posible_perdida a perdida (nadie
--    respondió la alerta en `horas_confirmacion`), la ficha pública decía
--    "El dueño confirmó que no está en su casa": falso. Se marca el caso con
--    `escalado_en` y `ficha_publica()` lo informa como `perdida_automatica`.
--    Los casos abiertos al aplicar esto los confirmó su dueño (ninguno tiene
--    notificación de paso automático), así que no hay que completar datos.
--
-- 2. DAT01 / detección automática: el dueño que abre la ficha de su propia
--    mascota (para probar, para compartirla, desde otra ciudad) registraba un
--    escaneo "real" y, lejos de casa, abría una posible pérdida de su propia
--    mascota. Si quien escanea es el dueño con sesión, no se registra nada.

alter table public.casos_perdida add column if not exists escalado_en timestamptz;

create or replace function public.escalar_casos_sin_respuesta()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_caso    record;
  v_total   int := 0;
begin
  for v_caso in
    select c.id, c.mascota_id, m.dueno_id, m.nombre, m.horas_confirmacion
    from casos_perdida c
    join mascotas m on m.id = c.mascota_id
    where c.estado = 'posible_perdida'
      and c.iniciado_en < now() - make_interval(hours => m.horas_confirmacion)
  loop
    update casos_perdida
       set estado = 'perdida', escalado_en = now()
     where id = v_caso.id and estado = 'posible_perdida';
    perform encolar_notificacion(
      v_caso.dueno_id, v_caso.mascota_id, 'perdida_automatica',
      v_caso.nombre || ' pasó a perdida',
      'Pasaron ' || v_caso.horas_confirmacion || ' h sin respuesta a la posible pérdida. Si está con vos, cerrá el caso desde el panel.',
      '/panel');
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$function$;

create or replace function public.ficha_publica(p_codigo text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_placa placas%rowtype;
  v_mascota mascotas%rowtype;
  v_estado  text;
  v_mensaje text;
  v_escalado timestamptz;
  v_ultima_lat double precision;
  v_ultima_lng double precision;
  v_telefono text;
  v_telefono_digitos text;
begin
  select * into v_placa from placas where codigo = p_codigo;

  if not found then
    return json_build_object('encontrada', false);
  end if;

  if v_placa.mascota_id is null then
    return json_build_object('encontrada', false, 'sin_activar', true);
  end if;

  select m.* into v_mascota
  from mascotas m
  where m.id = v_placa.mascota_id and m.activa = true and v_placa.estado = 'activa';

  if not found then
    return json_build_object('encontrada', false);
  end if;

  select estado, mensaje, ultima_lat, ultima_lng, escalado_en
    into v_estado, v_mensaje, v_ultima_lat, v_ultima_lng, v_escalado
  from casos_perdida
  where mascota_id = v_mascota.id
    and estado in ('posible_perdida','perdida')
  limit 1;

  if v_estado is not null then
    select telefono into v_telefono
    from perfiles
    where id = v_mascota.dueno_id;
  end if;

  v_telefono_digitos := regexp_replace(coalesce(v_telefono, ''), '\D', '', 'g');

  return json_build_object(
    'encontrada', true,
    'mascota_id', v_mascota.id,
    'nombre',     v_mascota.nombre,
    'especie',    v_mascota.especie,
    'sexo',       v_mascota.sexo,
    'raza',       v_mascota.raza,
    'tamano',     v_mascota.tamano,
    'color',      v_mascota.color,
    'senas',      case when v_mascota.visibilidad_senas = 'publico'
                    or (v_mascota.visibilidad_senas = 'perdida' and v_estado is not null)
               then v_mascota.senas else null end,
    'caracter',   v_mascota.caracter,
    'foto_url',   v_mascota.foto_url,
    'salud',      case when v_mascota.visibilidad_salud = 'publico'
                    or (v_mascota.visibilidad_salud = 'perdida' and v_estado is not null)
               then v_mascota.salud else null end,
    'estado',     coalesce(v_estado, 'en_casa'),
    'perdida_automatica', v_estado = 'perdida' and v_escalado is not null,
    'mensaje_perdida',   v_mensaje,
    'ultima_lat',        v_ultima_lat,
    'ultima_lng',        v_ultima_lng,
    'contacto_tel',      case when v_telefono_digitos <> '' then 'tel:+' || v_telefono_digitos else null end,
    'contacto_whatsapp', case when v_telefono_digitos <> '' then 'https://wa.me/' || v_telefono_digitos else null end
  );
end;
$function$;


create or replace function public.registrar_escaneo(
  p_codigo text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_mascota   mascotas%rowtype;
  v_placa     placas%rowtype;
  v_dist      double precision;
  v_lejos     boolean := false;
  v_caso_id   uuid;
begin
  select * into v_placa
  from placas
  where codigo = p_codigo and estado = 'activa';

  if not found then
    return json_build_object('ok', false, 'motivo', 'placa_inexistente');
  end if;

  select * into v_mascota
  from mascotas
  where id = v_placa.mascota_id and activa = true;

  if not found then
    return json_build_object('ok', false, 'motivo', 'placa_sin_mascota');
  end if;

  -- El dueño mirando la ficha de su propia mascota no es "alguien que la
  -- encontró": ni cuenta como escaneo ni dispara la detección automática.
  if auth.uid() is not null and auth.uid() = v_mascota.dueno_id then
    return json_build_object('ok', true, 'propio', true);
  end if;

  if p_lat is not null and v_mascota.domicilio_lat is not null then
    v_dist := distancia_metros(p_lat, p_lng,
                v_mascota.domicilio_lat, v_mascota.domicilio_lng);
    -- El modo paseo (DUE11) suspende la detección automática
    v_lejos := v_dist > v_mascota.radio_metros
               and (v_mascota.pausado_hasta is null
                    or v_mascota.pausado_hasta < now());
  end if;

  insert into escaneos (placa_id, mascota_id, lat, lng, distancia_m)
  values (v_placa.id, v_mascota.id, p_lat, p_lng, round(v_dist)::int);

  select id into v_caso_id
  from casos_perdida
  where mascota_id = v_mascota.id
    and estado in ('posible_perdida','perdida')
  limit 1;

  if v_caso_id is null and v_lejos then
    insert into casos_perdida (mascota_id, estado, origen, ultima_lat, ultima_lng)
    values (v_mascota.id, 'posible_perdida', 'automatico', p_lat, p_lng)
    returning id into v_caso_id;
  end if;

  return json_build_object(
    'ok', true,
    'mascota_id', v_mascota.id,
    'caso_id', v_caso_id,
    'lejos_de_casa', v_lejos,
    'distancia_m', round(v_dist)::int
  );
end;
$function$;
