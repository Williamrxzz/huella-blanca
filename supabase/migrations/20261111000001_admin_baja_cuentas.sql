-- Panel de administración: baja lógica de cuentas (2026-11-11).
--
-- "Eliminar" una cuenta es una baja LÓGICA (regla del proyecto: nunca se
-- borra físicamente; avisos, casos y escaneos son el historial de la
-- analítica). Marca el perfil como inactivo, desactiva sus mascotas, descarta
-- sus casos abiertos (para que no queden trabados por el índice único) y
-- bloquea el ingreso en Supabase Auth. Se puede revertir con
-- admin_restaurar_cuenta(), que reactiva solo la cuenta: las mascotas
-- desactivadas las reactiva el dueño o el admin a mano.

alter table public.perfiles
  add column if not exists activa boolean not null default true;

-- Misma función que antes, ahora devolviendo también "activa".
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
        p.activa,
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

create or replace function public.admin_eliminar_cuenta(p_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rol text;
begin
  if not exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'admin'
  ) then
    raise exception 'no_autorizado';
  end if;

  if p_id = auth.uid() then
    return json_build_object('ok', false, 'error', 'cuenta_propia');
  end if;

  select rol into v_rol from public.perfiles where id = p_id;
  if not found then
    return json_build_object('ok', false, 'error', 'cuenta_no_encontrada');
  end if;
  if v_rol = 'admin' then
    return json_build_object('ok', false, 'error', 'cuenta_admin');
  end if;

  update public.perfiles set activa = false where id = p_id;

  update public.casos_perdida
     set estado = 'descartada', cerrado_en = now()
   where estado in ('perdida', 'posible_perdida')
     and mascota_id in (select id from public.mascotas where dueno_id = p_id);

  update public.mascotas set activa = false where dueno_id = p_id;

  update auth.users set banned_until = 'infinity' where id = p_id;

  return json_build_object('ok', true);
end;
$$;

create or replace function public.admin_restaurar_cuenta(p_id uuid)
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

  update public.perfiles set activa = true where id = p_id;
  if not found then
    return json_build_object('ok', false, 'error', 'cuenta_no_encontrada');
  end if;

  update auth.users set banned_until = null where id = p_id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.admin_eliminar_cuenta(uuid) from public, anon;
revoke all on function public.admin_restaurar_cuenta(uuid) from public, anon;
grant execute on function public.admin_eliminar_cuenta(uuid) to authenticated;
grant execute on function public.admin_restaurar_cuenta(uuid) to authenticated;
