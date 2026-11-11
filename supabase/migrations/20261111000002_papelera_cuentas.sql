-- Panel de administración: papelera de cuentas con borrado definitivo a los
-- 30 días (2026-11-11).
--
-- EXCEPCIÓN DOCUMENTADA a la regla "las bajas son lógicas, nunca físicas":
-- por decisión del dueño del proyecto, una cuenta eliminada (a pedido de la
-- persona o por incumplir las normas de la plataforma) pasa 30 días en una
-- papelera, donde se puede restaurar, y después se borra por completo, sin
-- que quede ningún dato. El borrado lo hace la Edge Function `purgar-cuentas`
-- (necesita borrar también los archivos de Storage, que desde SQL no se
-- pueden borrar), que usa las funciones de este archivo. Solo las puede
-- ejecutar el rol de servicio.

alter table public.perfiles
  add column if not exists eliminada_en timestamptz;

-- Las cuentas que ya estaban dadas de baja entran a la papelera hoy.
update public.perfiles
   set eliminada_en = now()
 where activa = false and eliminada_en is null;

-- Eliminar ahora también anota cuándo, para contar los 30 días.
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

  update public.perfiles
     set activa = false, eliminada_en = coalesce(eliminada_en, now())
   where id = p_id;

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

  update public.perfiles set activa = true, eliminada_en = null where id = p_id;
  if not found then
    return json_build_object('ok', false, 'error', 'cuenta_no_encontrada');
  end if;

  update auth.users set banned_until = null where id = p_id;

  return json_build_object('ok', true);
end;
$$;

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
        p.eliminada_en,
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

-- Rutas (dentro del bucket fotos-mascotas) de todas las fotos de la cuenta:
-- de sus mascotas, del reencuentro de sus casos y de los avisos que dio.
create or replace function public.rutas_fotos_cuenta(p_id uuid)
returns text[]
language sql
security definer
set search_path to 'public'
as $$
  with urls as (
    select m.foto_url as url from public.mascotas m where m.dueno_id = p_id
    union all
    select c.foto_reencuentro_url
      from public.casos_perdida c
      join public.mascotas m on m.id = c.mascota_id
     where m.dueno_id = p_id
    union all
    select a.foto_url
      from public.avistamientos a
     where a.reportado_por = p_id
        or a.mascota_id in (select id from public.mascotas where dueno_id = p_id)
  )
  select coalesce(array_agg(distinct substring(url from '/fotos-mascotas/([^?]+)')), '{}')
    from urls
   where url is not null
     and substring(url from '/fotos-mascotas/([^?]+)') is not null;
$$;

-- Borra de la base todo lo de la cuenta. La Edge Function la llama después de
-- borrar las fotos y antes de borrar el usuario de Auth.
create or replace function public.purgar_cuenta(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_mascotas uuid[];
  v_placas uuid[];
begin
  -- Solo cuentas que están en la papelera: nunca una cuenta activa.
  if not exists (
    select 1 from public.perfiles
     where id = p_id and activa = false and eliminada_en is not null
  ) then
    raise exception 'cuenta_fuera_de_la_papelera';
  end if;

  select coalesce(array_agg(id), '{}') into v_mascotas
    from public.mascotas where dueno_id = p_id;
  select coalesce(array_agg(id), '{}') into v_placas
    from public.placas where mascota_id = any(v_mascotas);

  delete from public.avistamientos where mascota_id = any(v_mascotas);

  -- Los avisos que la persona dio sobre mascotas de otros dueños son parte
  -- del caso de ese otro dueño: quedan, pero sin ningún dato de quien avisó.
  update public.avistamientos
     set reportado_por = null, contacto = null, foto_url = null
   where reportado_por = p_id;

  delete from public.escaneos
   where mascota_id = any(v_mascotas) or placa_id = any(v_placas);

  delete from public.casos_perdida where mascota_id = any(v_mascotas);
  update public.casos_perdida set rescatista_id = null where rescatista_id = p_id;

  -- Las placas no tienen datos personales: se desvinculan y quedan de baja,
  -- para que un collar viejo nunca abra la ficha de otra mascota.
  update public.placas set mascota_id = null, estado = 'baja' where id = any(v_placas);

  delete from public.mascotas where dueno_id = p_id;
  delete from public.perfiles where id = p_id;
end;
$$;

revoke all on function public.rutas_fotos_cuenta(uuid) from public, anon, authenticated;
revoke all on function public.purgar_cuenta(uuid) from public, anon, authenticated;
grant execute on function public.rutas_fotos_cuenta(uuid) to service_role;
grant execute on function public.purgar_cuenta(uuid) to service_role;

revoke all on function public.admin_eliminar_cuenta(uuid) from public, anon;
revoke all on function public.admin_restaurar_cuenta(uuid) from public, anon;
revoke all on function public.admin_listar_cuentas() from public, anon;
grant execute on function public.admin_eliminar_cuenta(uuid) to authenticated;
grant execute on function public.admin_restaurar_cuenta(uuid) to authenticated;
grant execute on function public.admin_listar_cuentas() to authenticated;
