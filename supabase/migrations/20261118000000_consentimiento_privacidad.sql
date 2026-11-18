-- Política de privacidad (Ley 25.326, desde el 2026-11-18): se registra cuándo
-- aceptó cada cuenta. Queda nulo para las cuentas creadas antes de que
-- existiera la política. El navegador puede escribirlo solo al crear su
-- perfil (mismo permiso de columnas que nombre y teléfono).
alter table public.perfiles add column if not exists privacidad_aceptada_en timestamptz;

grant insert (privacidad_aceptada_en) on public.perfiles to authenticated;
