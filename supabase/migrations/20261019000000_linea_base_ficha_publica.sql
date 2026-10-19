-- Línea base: definición de public.ficha_publica(text) tal como estaba en producción el 2026-10-19,
-- extraída con pg_get_functiondef. No cambia nada: es la copia versionada de lo
-- que ya existía solo en Supabase. Idempotente (create or replace).
-- Permisos vigentes (no los modifica este archivo): execute para public, anon,
-- authenticated y service_role; security definer.

CREATE OR REPLACE FUNCTION public.ficha_publica(p_codigo text)
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

  select estado, mensaje, ultima_lat, ultima_lng
    into v_estado, v_mensaje, v_ultima_lat, v_ultima_lng
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
    'senas',      v_mascota.senas,
    'caracter',   v_mascota.caracter,
    'foto_url',   v_mascota.foto_url,
    'salud',      case when v_mascota.mostrar_salud then v_mascota.salud else null end,
    'estado',     coalesce(v_estado, 'en_casa'),
    'mensaje_perdida',   v_mensaje,
    'ultima_lat',        v_ultima_lat,
    'ultima_lng',        v_ultima_lng,
    'contacto_tel',      case when v_telefono_digitos <> '' then 'tel:+' || v_telefono_digitos else null end,
    'contacto_whatsapp', case when v_telefono_digitos <> '' then 'https://wa.me/' || v_telefono_digitos else null end
  );
end;
$function$;
