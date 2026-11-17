-- PER08 / REC02: al cerrar el caso, el dueño elige a quién agradecer
-- (revisión del 2026-11-17).
--
-- Antes, MapaAvistamientos.jsx asignaba el rescate al ÚLTIMO aviso hecho con
-- cuenta, sin preguntar: el mérito se repartía por azar (el último en avisar
-- puede haberla visto pasar; quien la devolvió, no). Y el navegador escribía
-- `rescatista_id` directo, así que con la API se podía poner cualquier cuenta.
--
-- Ahora:
--   * colaboradores_del_caso(): la lista de quienes avisaron con cuenta en un
--     caso, solo para su dueño (el dueño no puede leer perfiles ajenos).
--   * cerrar_caso(): cierra el caso con el agradecimiento, verificando que el
--     rescatista elegido haya avisado en ESE caso.
--   * El navegador solo puede escribir en casos_perdida las columnas que usa
--     el panel; `rescatista_id` y `escalado_en` quedan fuera.

create or replace function public.colaboradores_del_caso(p_caso_id uuid)
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_dueno uuid;
begin
  select m.dueno_id into v_dueno
    from casos_perdida c join mascotas m on m.id = c.mascota_id
   where c.id = p_caso_id;
  if v_dueno is null or v_dueno is distinct from auth.uid() then
    raise exception 'no_autorizado';
  end if;

  return coalesce((
    select json_agg(x order by x.hubo_conmigo desc, x.ultimo_aviso_en desc)
    from (
      select a.reportado_por as perfil_id,
             -- Solo el primer nombre: alcanza para reconocer a la persona.
             coalesce(nullif(split_part(btrim(p.nombre), ' ', 1), ''), 'Alguien') as nombre,
             count(*)::int as avisos,
             bool_or(a.situacion = 'conmigo') as hubo_conmigo,
             max(a.creado_en) as ultimo_aviso_en
        from avistamientos a
        left join perfiles p on p.id = a.reportado_por
       where a.caso_id = p_caso_id
         and a.reportado_por is not null
         and a.reportado_por <> v_dueno
       group by a.reportado_por, p.nombre
    ) x
  ), '[]'::json);
end;
$$;

revoke all on function public.colaboradores_del_caso(uuid) from public, anon;
grant execute on function public.colaboradores_del_caso(uuid) to authenticated;

create or replace function public.cerrar_caso(
  p_caso_id uuid,
  p_rescatista_id uuid default null,
  p_mensaje text default null,
  p_foto_url text default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_dueno  uuid;
  v_estado text;
begin
  select m.dueno_id, c.estado into v_dueno, v_estado
    from casos_perdida c join mascotas m on m.id = c.mascota_id
   where c.id = p_caso_id
   for update of c;
  if v_dueno is null or v_dueno is distinct from auth.uid() then
    return json_build_object('ok', false, 'motivo', 'no_autorizado');
  end if;
  if v_estado not in ('posible_perdida', 'perdida') then
    return json_build_object('ok', false, 'motivo', 'caso_cerrado');
  end if;
  if p_rescatista_id is not null and not exists (
       select 1 from avistamientos
        where caso_id = p_caso_id and reportado_por = p_rescatista_id and reportado_por <> v_dueno) then
    return json_build_object('ok', false, 'motivo', 'rescatista_invalido');
  end if;

  update casos_perdida
     set estado = 'cerrada',
         cerrado_en = now(),
         rescatista_id = p_rescatista_id,
         mensaje_agradecimiento = nullif(btrim(p_mensaje), ''),
         foto_reencuentro_url = p_foto_url
   where id = p_caso_id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.cerrar_caso(uuid, uuid, text, text) from public, anon;
grant execute on function public.cerrar_caso(uuid, uuid, text, text) to authenticated;

-- El navegador escribe en casos_perdida solo lo que usa el panel (PER01,
-- PER03, PER07): crear el caso y actualizar estado, mensaje y última
-- ubicación. El cierre con agradecimiento va por cerrar_caso().
revoke insert, update on public.casos_perdida from anon, authenticated;
grant insert (mascota_id, estado, origen, mensaje, ultima_lat, ultima_lng) on public.casos_perdida to authenticated;
grant update (estado, mensaje, ultima_lat, ultima_lng, cerrado_en) on public.casos_perdida to authenticated;
