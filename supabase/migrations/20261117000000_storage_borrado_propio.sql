-- Fugas menores de Storage (2026-11-17). Sin historia asociada.
--
-- Hasta ahora el bucket `fotos-mascotas` tenía políticas de lectura, subida y
-- actualización, pero ninguna de borrado: el navegador no podía limpiar una
-- foto que había subido. Hacía falta para dos casos:
--   a) la mascota (o el cierre del caso) falla después de subir la foto →
--      se borra la foto recién subida en vez de dejarla huérfana;
--   b) al editar una mascota y reemplazar la foto, se borra la anterior.
-- Cada dueño solo puede borrar dentro de su propia carpeta (<uid>/...), la
-- misma regla que ya aplica la política de actualización.

drop policy if exists fotos_mascotas_borrado_propio_dueno on storage.objects;
create policy fotos_mascotas_borrado_propio_dueno on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'fotos-mascotas'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
