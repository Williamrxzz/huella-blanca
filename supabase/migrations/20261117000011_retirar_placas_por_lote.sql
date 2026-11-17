-- ADM01: se retira el circuito de placas por lote (revisión del 2026-11-17).
--
-- El administrador generaba placas en blanco (`sin_asignar`) que después se
-- "activaban" al escanearlas y registrarse. Solo tiene sentido si alguien
-- imprime y reparte placas antes de que el dueño se registre (por ejemplo,
-- grabadas en metal y vendidas o entregadas en una veterinaria). Ese canal no
-- existe: se retiró en septiembre junto con los comercios adheridos. Las 45
-- generadas nunca se usaron. Cada mascota recibe su código QR automáticamente
-- al cargarla (generar_placa), que es el flujo que usa un dueño real.
--
-- Si algún día hay placas grabadas para repartir, el circuito está en el
-- historial de git (migraciones y AdminPlacas.jsx) y en TRAZABILIDAD.md.
--
-- Bajas lógicas: las placas sin usar no se borran, pasan a `baja`.

update public.placas set estado = 'baja' where estado = 'sin_asignar' and mascota_id is null;
alter table public.placas alter column estado set default 'activa';

drop function if exists public.generar_lote_placas(integer);
drop function if exists public.vincular_placa(text, uuid);

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

  -- Placa sin mascota (dada de baja, o de una cuenta eliminada): no se
  -- reconoce. Antes respondía "sin activar" e invitaba a activarla, lo que
  -- permitía quedarse con la placa de un collar ajeno.
  if v_placa.mascota_id is null then
    return json_build_object('encontrada', false);
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

create or replace function public.admin_estadisticas()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dias constant int := 30;
  v_hoy constant date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if not exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'no_autorizado';
  end if;

  return json_build_object(
    'totales', json_build_object(
      'cuentas', (select count(*) from public.perfiles),
      'mascotas_activas', (select count(*) from public.mascotas where activa),
      'placas_activas', (select count(*) from public.placas where estado = 'activa'),
      'escaneos', (select count(*) from public.escaneos),
      'avisos', (select count(*) from public.avistamientos),
      'casos_abiertos', (select count(*) from public.casos_perdida
                          where estado in ('perdida', 'posible_perdida')),
      'reencuentros', (select count(*) from public.casos_perdida where estado = 'cerrada')
    ),
    'escaneos_por_dia', (
      select json_agg(json_build_object('dia', d.dia, 'total', coalesce(e.total, 0)) order by d.dia)
      from (select generate_series(v_hoy - (v_dias - 1), v_hoy, '1 day')::date as dia) d
      left join (
        select (ocurrido_en at time zone 'America/Argentina/Buenos_Aires')::date as dia, count(*) as total
        from public.escaneos group by 1
      ) e on e.dia = d.dia
    ),
    'avisos_por_dia', (
      select json_agg(json_build_object('dia', d.dia, 'total', coalesce(a.total, 0)) order by d.dia)
      from (select generate_series(v_hoy - (v_dias - 1), v_hoy, '1 day')::date as dia) d
      left join (
        select (creado_en at time zone 'America/Argentina/Buenos_Aires')::date as dia, count(*) as total
        from public.avistamientos group by 1
      ) a on a.dia = d.dia
    ),
    'casos_por_estado', (
      select json_agg(json_build_object('estado', s.estado, 'total', coalesce(c.total, 0)) order by s.orden)
      from (values ('perdida', 1), ('posible_perdida', 2), ('cerrada', 3), ('descartada', 4)) as s(estado, orden)
      left join (select estado, count(*) as total from public.casos_perdida group by 1) c
        on c.estado = s.estado
    )
  );
end;
$function$;
