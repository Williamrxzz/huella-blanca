-- TRA05: el teléfono del dueño se guarda en formato internacional (E.164).
--
-- `ficha_publica()` arma los botones con 'tel:+' || dígitos y
-- 'https://wa.me/' || dígitos. Con el texto tal cual lo escribía la persona
-- ("2974123456", "0297 15 ..."), el link apuntaba a un número inexistente:
-- el botón de contacto fallaba justo cuando la mascota estaba perdida.
-- Desde el 2026-11-17 la app normaliza al guardar (src/lib/telefono.js) y los
-- dos teléfonos ya cargados se convirtieron antes de esta migración. Este
-- check impide que vuelva a entrar un número en otro formato por cualquier
-- camino (la API REST acepta lo que se le mande).

alter table public.perfiles
  add constraint perfiles_telefono_e164
  check (telefono is null or telefono ~ '^\+[1-9][0-9]{7,14}$');
