-- Limpieza de permisos y políticas (revisión del 2026-11-17).
--
-- Lo que mostró el esquema exportado (supabase/esquema/esquema.sql):
--
-- 1. "Las bajas son lógicas, nunca físicas" (CLAUDE.md, sección 2) no estaba
--    garantizado por la base: las políticas "mascotas: dueño" y
--    "casos: dueño" eran `for all`, así que un dueño podía BORRAR sus
--    mascotas y sus casos con un DELETE directo a la API. La app nunca lo
--    hace (da de baja con `activa = false` y cierra con `estado`), pero la
--    regla tiene que valer aunque alguien llame a la API a mano. Se parten en
--    leer / crear / actualizar, sin borrar, y además se quita el privilegio de
--    DELETE a nivel tabla para el navegador en las tablas de historial.
--    El borrado de cuentas del administrador no cambia: lo hace la Edge
--    Function `eliminar-cuenta` con la clave de servicio.
--
-- 2. Política duplicada en `placas` (dos idénticas).
--
-- 3. Funciones que solo tienen sentido con una cuenta eran ejecutables por
--    `anon`. No era explotable (todas verifican auth.uid() o el rol adentro),
--    pero la documentación decía "solo authenticated" y la base no.

-- ---------------------------------------------------------------------------
-- 1. Sin DELETE para el navegador
-- ---------------------------------------------------------------------------
drop policy if exists "mascotas: dueño" on public.mascotas;
create policy "mascotas: dueño lee" on public.mascotas
  for select to authenticated using (auth.uid() = dueno_id);
create policy "mascotas: dueño crea" on public.mascotas
  for insert to authenticated with check (auth.uid() = dueno_id);
create policy "mascotas: dueño edita" on public.mascotas
  for update to authenticated using (auth.uid() = dueno_id) with check (auth.uid() = dueno_id);

-- Crear y actualizar casos ya tienen sus políticas propias
-- ("dueños crean casos de sus mascotas", "dueños actualizan casos de sus mascotas").
drop policy if exists "casos: dueño" on public.casos_perdida;
create policy "casos: dueño lee" on public.casos_perdida
  for select to authenticated
  using (exists (select 1 from mascotas m where m.id = casos_perdida.mascota_id and m.dueno_id = auth.uid()));

revoke delete on public.perfiles, public.mascotas, public.placas, public.casos_perdida,
                 public.escaneos, public.avistamientos, public.notificaciones
  from anon, authenticated;
-- (suscripciones_push conserva DELETE: el dueño desactiva los avisos de su dispositivo.)

-- ---------------------------------------------------------------------------
-- 2. Política duplicada
-- ---------------------------------------------------------------------------
drop policy if exists "placas: dueño de la mascota" on public.placas;
-- queda duenos_ven_sus_placas, idéntica

-- ---------------------------------------------------------------------------
-- 3. Funciones solo para cuentas
-- ---------------------------------------------------------------------------
revoke execute on function public.generar_placa(uuid) from public, anon;
revoke execute on function public.vincular_placa(text, uuid) from public, anon;
revoke execute on function public.historial_colaboracion() from public, anon;
revoke execute on function public.generar_lote_placas(integer) from public, anon;
grant execute on function public.generar_placa(uuid) to authenticated;
grant execute on function public.vincular_placa(text, uuid) to authenticated;
grant execute on function public.historial_colaboracion() to authenticated;
grant execute on function public.generar_lote_placas(integer) to authenticated;
