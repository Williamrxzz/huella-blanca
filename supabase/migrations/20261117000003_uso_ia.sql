-- Límite de uso de la IA por cuenta (revisión de seguridad del 2026-11-17).
--
-- Cada clasificación de foto con Claude (sugerir-ficha, o subir-foto cuando no
-- trae pase) deja una fila acá. Las Edge Functions cuentan las de la última hora
-- antes de llamar a la API: así una cuenta no puede gastar la API en bucle.
-- Solo la escriben y la leen las funciones (service role): RLS activo y sin
-- políticas, el navegador no ve nada. Es un registro: no se borra.

create table if not exists public.uso_ia (
  id bigint generated always as identity primary key,
  perfil_id uuid not null references auth.users (id) on delete cascade,
  funcion text not null check (funcion in ('sugerir-ficha', 'subir-foto')),
  creado_en timestamptz not null default now()
);

create index if not exists uso_ia_perfil_fecha on public.uso_ia (perfil_id, creado_en desc);

alter table public.uso_ia enable row level security;
revoke all on public.uso_ia from anon, authenticated;
