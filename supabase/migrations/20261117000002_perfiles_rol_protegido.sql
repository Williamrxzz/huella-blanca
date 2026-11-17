-- Seguridad: el navegador no puede elegir ni cambiar el rol de una cuenta.
--
-- Antes, las políticas de `perfiles` solo verificaban `auth.uid() = id`, así que
-- cualquier cuenta podía crear su perfil con rol = 'admin' (o cambiarse el rol
-- después) y con eso pasar todos los chequeos de administración que se hacen
-- dentro de las funciones (admin_listar_cuentas, generar_lote_placas, etc.).
-- Ver TRAZABILIDAD.md, entrada del 2026-11-17 (revisión de seguridad).
--
-- Dos defensas independientes:
--   1. Privilegios de columna: anon y authenticated solo pueden escribir
--      id/nombre/telefono. La columna rol no se puede ni nombrar desde la API.
--   2. Trigger de respaldo: si alguna vez se vuelve a otorgar el privilegio por
--      error, un INSERT hecho por un usuario común queda en 'usuario' y un
--      UPDATE no puede cambiar el rol. El SQL Editor y el service role (sin
--      auth.uid()) siguen pudiendo asignar administradores.

alter table public.perfiles alter column rol set default 'usuario';

revoke insert, update on public.perfiles from anon, authenticated;
grant insert (id, nombre, telefono) on public.perfiles to authenticated;
grant update (nombre, telefono) on public.perfiles to authenticated;

create or replace function public.proteger_rol_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sin sesión de usuario (SQL Editor, service role): se respeta lo pedido.
  if auth.uid() is null then
    return new;
  end if;
  -- Un administrador real puede cambiar roles desde una función propia.
  if exists (select 1 from perfiles where id = auth.uid() and rol = 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rol := 'usuario';
  else
    new.rol := old.rol;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_rol_perfil on public.perfiles;
create trigger proteger_rol_perfil
  before insert or update on public.perfiles
  for each row execute function public.proteger_rol_perfil();

-- Política duplicada (misma condición que "perfil propio: crear").
drop policy if exists "dueños crean su propio perfil" on public.perfiles;

-- El UPDATE también verifica la fila resultante, no solo la original.
drop policy if exists "perfil propio: editar" on public.perfiles;
create policy "perfil propio: editar" on public.perfiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
