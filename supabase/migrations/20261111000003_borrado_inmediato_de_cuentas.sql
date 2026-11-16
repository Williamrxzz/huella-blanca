-- Borrado inmediato de cuentas, sin papelera (2026-11-16).
--
-- Se simplifica el diseño anterior: eliminar una cuenta desde /admin/cuentas la
-- borra al instante y para siempre (datos, fotos y usuario de Auth), vía la Edge
-- Function `eliminar-cuenta`. Desaparecen la papelera, la restauración, el
-- bloqueo de ingreso, el cron y la función programada `purgar-cuentas`.
--
-- Esto corrige además un defecto del diseño anterior: el bloqueo usaba
-- banned_until = 'infinity', que el servidor de Auth no sabe leer, y por eso no
-- podía borrar el usuario ("Database error loading user").

-- 1) Fuera el cron de la papelera.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purgar-cuentas') then
    perform cron.unschedule('purgar-cuentas');
  end if;
end $$;

-- 2) Los usuarios que habían quedado bloqueados vuelven a ser cuentas normales
--    (se pueden eliminar de verdad desde el panel).
update auth.users set banned_until = null where banned_until is not null;

-- 3) Fuera las funciones de baja lógica y de restaurar.
drop function if exists public.admin_eliminar_cuenta(uuid);
drop function if exists public.admin_restaurar_cuenta(uuid);

-- 4) La lista de cuentas ya no devuelve "activa" ni "eliminada_en".
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

-- 5) Las columnas de la papelera ya no se usan.
alter table public.perfiles
  drop column if exists activa,
  drop column if exists eliminada_en;

-- 6) purgar_cuenta ya no exige que la cuenta esté en la papelera. Solo la puede
--    ejecutar el rol de servicio (la llama la Edge Function después de verificar
--    que quien pide el borrado es administrador). Nunca borra a un administrador.
create or replace function public.purgar_cuenta(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_rol text;
  v_mascotas uuid[];
  v_placas uuid[];
begin
  select rol into v_rol from public.perfiles where id = p_id;
  if not found then
    raise exception 'cuenta_no_encontrada';
  end if;
  if v_rol = 'admin' then
    raise exception 'cuenta_admin';
  end if;

  select coalesce(array_agg(id), '{}') into v_mascotas
    from public.mascotas where dueno_id = p_id;
  select coalesce(array_agg(id), '{}') into v_placas
    from public.placas where mascota_id = any(v_mascotas);

  delete from public.avistamientos where mascota_id = any(v_mascotas);

  -- Los avisos que la persona dio sobre mascotas de otros dueños son parte del
  -- caso de ese otro dueño: quedan, pero sin ningún dato de quien avisó.
  update public.avistamientos
     set reportado_por = null, contacto = null, foto_url = null
   where reportado_por = p_id;

  delete from public.escaneos
   where mascota_id = any(v_mascotas) or placa_id = any(v_placas);

  delete from public.casos_perdida where mascota_id = any(v_mascotas);
  update public.casos_perdida set rescatista_id = null where rescatista_id = p_id;

  -- Las placas no tienen datos personales: se desvinculan y quedan de baja, para
  -- que un collar viejo nunca abra la ficha de otra mascota.
  update public.placas set mascota_id = null, estado = 'baja' where id = any(v_placas);

  delete from public.mascotas where dueno_id = p_id;
  delete from public.perfiles where id = p_id;
end;
$$;

revoke all on function public.purgar_cuenta(uuid) from public, anon, authenticated;
grant execute on function public.purgar_cuenta(uuid) to service_role;

revoke all on function public.admin_listar_cuentas() from public, anon;
grant execute on function public.admin_listar_cuentas() to authenticated;
