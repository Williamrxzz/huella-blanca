-- DUE05: visibilidad configurable de señas y salud (2026-10-19).
--
-- Cada dueño decide, para estos dos campos, si son 'publico' (siempre
-- visibles en la ficha), 'perdida' (solo si hay un caso abierto: estado
-- posible_perdida o perdida, el mismo criterio que ya usa el teléfono de
-- contacto) o 'privado' (nunca). Domicilio, contacto, última ubicación y el
-- resto de las claves de ficha_publica() no cambian.
--
-- mostrar_salud se deja en la tabla pero ficha_publica() deja de usarla; se
-- elimina en una migración posterior, cuando el frontend ya no la escriba.

alter table public.mascotas
  add column visibilidad_senas text not null default 'publico'
    constraint mascotas_visibilidad_senas_check
    check (visibilidad_senas in ('publico', 'perdida', 'privado')),
  add column visibilidad_salud text not null default 'privado'
    constraint mascotas_visibilidad_salud_check
    check (visibilidad_salud in ('publico', 'perdida', 'privado'));

-- Que nadie vea cambiar su ficha el día del deploy: señas siguen públicas y la
-- salud conserva lo que decía mostrar_salud.
update public.mascotas set visibilidad_salud = 'publico' where mostrar_salud;

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
    'senas',      case when v_mascota.visibilidad_senas = 'publico'
                    or (v_mascota.visibilidad_senas = 'perdida' and v_estado is not null)
               then v_mascota.senas else null end,
    'caracter',   v_mascota.caracter,
    'foto_url',   v_mascota.foto_url,
    'salud',      case when v_mascota.visibilidad_salud = 'publico'
                    or (v_mascota.visibilidad_salud = 'perdida' and v_estado is not null)
               then v_mascota.salud else null end,
    'estado',     coalesce(v_estado, 'en_casa'),
    'mensaje_perdida',   v_mensaje,
    'ultima_lat',        v_ultima_lat,
    'ultima_lng',        v_ultima_lng,
    'contacto_tel',      case when v_telefono_digitos <> '' then 'tel:+' || v_telefono_digitos else null end,
    'contacto_whatsapp', case when v_telefono_digitos <> '' then 'https://wa.me/' || v_telefono_digitos else null end
  );
end;
$function$;
