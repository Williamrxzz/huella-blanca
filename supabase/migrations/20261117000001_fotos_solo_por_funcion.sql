-- IA02 del lado del servidor (2026-11-17).
--
-- Hasta ahora la verificación de la foto corría solo en el navegador: con la
-- política de subida, cualquiera con sesión podía mandar una imagen directo a
-- Storage sin pasar por la IA. Desde ahora las fotos entran únicamente por la
-- Edge Function `subir-foto`, que verifica (o acepta un pase de `sugerir-ficha`)
-- y guarda con la clave de servicio. El navegador ya no puede subir ni
-- sobrescribir objetos del bucket; sí puede leerlos (público) y borrar los
-- propios (limpieza de fotos reemplazadas o de guardados fallidos).

drop policy if exists fotos_mascotas_subida_propio_dueno on storage.objects;
drop policy if exists fotos_mascotas_actualizacion_propio_dueno on storage.objects;
