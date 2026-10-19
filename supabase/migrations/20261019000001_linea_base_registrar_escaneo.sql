-- Línea base: definición de public.registrar_escaneo(text, double precision, double precision) tal como estaba en producción el 2026-10-19,
-- extraída con pg_get_functiondef. No cambia nada: es la copia versionada de lo
-- que ya existía solo en Supabase. Idempotente (create or replace).
-- Permisos vigentes (no los modifica este archivo): execute para public, anon,
-- authenticated y service_role; security definer.

CREATE OR REPLACE FUNCTION public.registrar_escaneo(p_codigo text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
