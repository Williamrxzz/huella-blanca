-- Panel de administración: estadísticas (2026-11-16). DAT05.
--
-- Una función de solo lectura que devuelve datos AGREGADOS (conteos), nunca
-- coordenadas ni datos personales. El rol se verifica DENTRO de la función.

create or replace function public.admin_estadisticas()
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
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
      'placas_sin_asignar', (select count(*) from public.placas where estado = 'sin_asignar'),
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
$$;

revoke all on function public.admin_estadisticas() from public, anon;
grant execute on function public.admin_estadisticas() to authenticated;
