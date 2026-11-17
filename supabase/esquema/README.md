# Esquema de la base

`esquema.sql` es una **foto del esquema actual** de la base en Supabase: las
tablas con sus columnas, restricciones e índices, las funciones, los triggers,
la seguridad por filas (RLS) y sus políticas (también las de Storage), los
permisos por tabla, columna y función, el bucket de fotos y la tarea de
`pg_cron`. No lleva datos ni valores secretos (de Vault, solo los nombres).

Sirve para dos cosas:

- **Reconstruir la base** en un proyecto nuevo de Supabase, que ya trae `auth`,
  `storage`, los roles `anon`/`authenticated`/`service_role` y las extensiones:
  se ejecuta entero en el editor SQL y después se cargan a mano los secretos de
  Vault y de las Edge Functions.
- **Ver cómo está hoy** la base sin abrir el panel de Supabase, y que el diff de
  git muestre exactamente qué cambió en cada migración.

## Cómo se genera

```
npm run esquema:exportar
```

`supabase db dump` necesita Docker, que este proyecto no usa. `exportar.mjs`
arma el mismo resultado leyendo el catálogo de Postgres con
`supabase db query --linked` (solo lecturas). Es determinista: si la base no
cambió, el archivo sale idéntico. Si algo de lo exportado parece un secreto,
aborta sin escribir.

**Después de aplicar una migración, volver a exportar y commitear el
`esquema.sql` junto con la migración.**

## Relación con `supabase/migrations`

Las migraciones son la historia de los cambios desde el 2026-10-19; las tablas
originales se crearon antes, a mano en el editor SQL, y no tienen migración.
Por eso las migraciones solas no alcanzan para reconstruir la base: este
archivo sí. No va dentro de `migrations/` para que la CLI no intente
aplicarlo como un cambio.

## Verificación

El 2026-11-17 se ejecutó `esquema.sql` completo en un PostgreSQL 17 vacío
(PGlite) con las piezas de Supabase simuladas (`auth.uid()`, `storage`,
`net.http_post`, `vault`, `cron`): se crearon los 9 tablas, 42 restricciones,
22 funciones, 5 triggers y 22 políticas, y un recorrido de humo (alta de dueño,
mascota y placa; ficha pública sin domicilio; escaneo lejos de casa que abre el
caso y encola la notificación; contacto solo con caso abierto; check del
teléfono; `rol` no escribible por `authenticated`) pasó 15/15.
