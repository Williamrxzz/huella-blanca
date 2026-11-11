-- Panel de administración: cuentas (2026-11-11). Sin historia asociada.
--
-- Dos funciones de solo lectura para que el administrador vea las cuentas de
-- los dueños. El rol se verifica DENTRO de la función (no alcanza con
-- proteger la pantalla), igual que generar_lote_placas().
--
-- EXCEPCIÓN DOCUMENTADA a la regla "el domicilio jamás se expone": el
-- administrador ve teléfono, email y la coordenada del domicilio de cada
-- mascota, por decisión del dueño del proyecto, para verificar que los
-- domicilios sean reales. Es solo para rol = 'admin' y nunca llega a la
-- ficha pública, que sigue sirviéndose únicamente por ficha_publica().

create or replace function public.admin_listar_cuentas()
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'no_autorizado';
  end if;

  return coalesce((
    select json_agg(c order by c.creado_en desc)
    from (
      select
        p.id,
        p.nombre,
        p.telefono,
        p.rol,
        p.creado_en,
        u.email,
        u.last_sign_in_at as ultimo_ingreso,
        (select count(*) from public.mascotas m
          where m.dueno_id = p.id and m.activa) as mascotas_activas
      from public.perfiles p
      left join auth.users u on u.id = p.id
    ) c
  ), '[]'::json);
end;
$$;

create or replace function public.admin_detalle_cuenta(p_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_resultado json;
begin
  if not exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'no_autorizado';
  end if;

  select json_build_object(
    'id', p.id,
    'nombre', p.nombre,
    'telefono', p.telefono,
    'rol', p.rol,
    'creado_en', p.creado_en,
    'email', u.email,
    'ultimo_ingreso', u.last_sign_in_at,
    'avisos_dados', (select count(*) from public.avistamientos a where a.reportado_por = p.id),
    'mascotas', coalesce((
      select json_agg(json_build_object(
        'id', m.id,
        'nombre', m.nombre,
        'especie', m.especie,
        'raza', m.raza,
        'activa', m.activa,
        'domicilio_lat', m.domicilio_lat,
        'domicilio_lng', m.domicilio_lng,
        'radio_metros', m.radio_metros,
        'creado_en', m.creado_en,
        'placa', (select pl.codigo from public.placas pl
                   where pl.mascota_id = m.id and pl.estado = 'activa'
                   limit 1),
        'caso_abierto', (select c.estado from public.casos_perdida c
                          where c.mascota_id = m.id
                            and c.estado in ('perdida', 'posible_perdida')
                          limit 1),
        'escaneos', (select count(*) from public.escaneos e where e.mascota_id = m.id),
        'avistamientos', (select count(*) from public.avistamientos a where a.mascota_id = m.id)
      ) order by m.creado_en desc)
      from public.mascotas m
      where m.dueno_id = p.id
    ), '[]'::json)
  )
  into v_resultado
  from public.perfiles p
  left join auth.users u on u.id = p.id
  where p.id = p_id;

  return v_resultado;
end;
$$;

revoke all on function public.admin_listar_cuentas() from public, anon;
revoke all on function public.admin_detalle_cuenta(uuid) from public, anon;
grant execute on function public.admin_listar_cuentas() to authenticated;
grant execute on function public.admin_detalle_cuenta(uuid) to authenticated;
