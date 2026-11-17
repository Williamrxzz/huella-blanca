-- Revisión del 2026-11-17: TRA11 (avisar sin ubicación) y TRA09/REC09
-- (asociar el aviso a la cuenta creada después).

-- TRA11: el aviso sin coordenadas ya estaba permitido en la tabla, pero:
--   * la función pisaba la última ubicación del caso con NULL (un aviso sin
--     ubicación borraba la zona que muestra la ficha pública);
--   * nada exigía que, sin punto en el mapa, la persona describiera el lugar.
-- Ahora: sin coordenadas hace falta un texto (el lugar descrito), y la
-- última ubicación del caso solo se actualiza si el aviso trae coordenadas.
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

-- TRA09/REC09: la ventana para reclamar un aviso hecho sin cuenta era de
-- 1 hora, pero el proyecto exige confirmar el email antes de dar sesión: quien
-- confirmaba al día siguiente perdía el reconocimiento sin enterarse. El id
-- del aviso es un UUID que solo conoce el navegador que lo envió (no se puede
-- adivinar), así que alargar la ventana a 7 días no abre nada nuevo.
-- Devuelve el nombre de la mascota para que la pantalla confirme.
create or replace function public.reclamar_avistamiento(p_avistamiento_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_nombre text;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;

  update avistamientos a
     set reportado_por = auth.uid()
    from mascotas m
   where a.id = p_avistamiento_id
     and m.id = a.mascota_id
     and a.reportado_por is null
     and a.creado_en > now() - interval '7 days'
  returning m.nombre into v_nombre;

  if v_nombre is null then
    return json_build_object('ok', false, 'motivo', 'no_reclamable');
  end if;
  return json_build_object('ok', true, 'mascota', v_nombre);
end;
$function$;

revoke execute on function public.reclamar_avistamiento(uuid) from anon, public;
grant execute on function public.reclamar_avistamiento(uuid) to authenticated;
