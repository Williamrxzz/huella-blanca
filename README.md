# Huella Blanca

PWA de identificación y recuperación de mascotas perdidas, mediante un
código QR en el collar. Proyecto académico de la UNPA, Caleta Olivia,
Argentina.

Quien encuentra a la mascota escanea el QR con la cámara del teléfono,
ve su ficha y puede avisar dónde la vio — sin instalar nada y sin
registrarse. El dueño usa la app instalable para gestionar la búsqueda.

**Producción**: https://huella-blanca.vercel.app ·
**Ficha de ejemplo** (sin tocar datos reales): https://huella-blanca.vercel.app/ejemplo

## Estado (cierre del 18/11/2026, tag `sprint-5-entrega`)

Sprints 1 a 5 completos y backlog cerrado: de las 63 historias, **39
terminadas**, **2 opcionales** (TRA07 y ADM03, para seguir si hay
tiempo) y **22 descartadas o retiradas con justificación**. El detalle de
cada decisión, con su commit y cómo se probó, está en
[`TRAZABILIDAD.md`](TRAZABILIDAD.md).

Lo principal:

- **Quien encuentra la mascota:** ficha pública por QR sin instalar ni
  registrarse; aviso "La vi acá" con GPS, punto en el mapa o descripción
  del lugar; botones de llamar y WhatsApp que no muestran el número y solo
  aparecen si la mascota está perdida.
- **Dueño:** alta de mascota con foto (la IA verifica la foto y sugiere los
  datos), QR automático, marcar como perdida, notificaciones push, mapa de
  avisos, "Compartir la búsqueda" con afiche, modo paseo, reemplazar el
  código QR, agradecer a quien ayudó, recuperar la contraseña y eliminar la
  propia cuenta.
- **Detección automática:** un escaneo lejos de casa abre una posible
  pérdida y avisa al dueño; si no responde en el plazo que eligió, pasa
  sola a perdida.
- **Administración:** cuentas y estadísticas (Recharts).
- **Privacidad y seguridad:** el domicilio se guarda solo como coordenada
  y nunca se expone; permisos controlados por la base (RLS y privilegios
  por columna); bajas lógicas garantizadas por la base; política de
  privacidad (Ley 25.326) y consentimiento; encabezados de seguridad (CSP).

## Stack

React + Vite (PWA con vite-plugin-pwa), Supabase (PostgreSQL, Auth,
Storage, Edge Functions, pg_cron), Leaflet + OpenStreetMap, Web Push,
Claude (Haiku) para verificar fotos, Vercel. Sin servicios pagos.

## Instalación

```bash
npm install
npm run dev
```

Para el build de producción:

```bash
npm run build
npm run preview
```

## Variables de entorno

Van en un archivo `.env.local` en la raíz (nunca se commitea):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

La clave de la API de Claude (`ANTHROPIC_API_KEY`) **no** es una
variable de este archivo: vive únicamente como secreto de Supabase,
porque la usa una Edge Function, nunca el frontend.

## Pruebas

```bash
npm test                                   # 22 unitarias, sin red, ~2 s
PRUEBAS_EN_PRODUCCION=si npm run test:e2e  # 21 de punta a punta (~30 min)
```

Las de punta a punta corren contra la base real con cuentas temporales que
se borran solas; por eso piden la variable. Detalle en
[`tests/README.md`](tests/README.md).

## Base de datos

El esquema completo (tablas, funciones, triggers, políticas, permisos) está
en [`supabase/esquema/esquema.sql`](supabase/esquema/esquema.sql) y se
regenera con `npm run esquema:exportar`; los cambios, en
`supabase/migrations/`.

## Documentación

Los documentos de la entrega (Historias de Usuario, Diseño de Base de
Datos, Modelo de Datos, Product Backlog / Sprint Board y User Story
Mapping, más el Plan de Pruebas y la entrega del Sprint 5) están en
[`docs/`](docs/); las versiones vigentes se listan en
[`docs/LEEME.md`](docs/LEEME.md). El detalle de decisiones, qué se
construyó y qué se descartó y por qué está en `TRAZABILIDAD.md`; el
contexto completo del proyecto y el estado de cada sprint, en
`CLAUDE.md`.
