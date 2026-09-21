# Huella Blanca

PWA de identificación y recuperación de mascotas perdidas, mediante un
código QR en el collar. Proyecto académico de la UNPA, Caleta Olivia,
Argentina.

Quien encuentra a la mascota escanea el QR con la cámara del teléfono,
ve su ficha y puede avisar dónde la vio — sin instalar nada y sin
registrarse. El dueño usa la app instalable para gestionar la búsqueda.

**Producción**: https://huella-blanca.vercel.app

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

## Documentación

Los documentos de la entrega (Historias de Usuario, Diseño de Base de
Datos, Modelo de Datos, Product Backlog / Sprint Board y User Story
Mapping) están en [`docs/`](docs/). El detalle de decisiones, qué se
construyó y qué se descartó y por qué está en `TRAZABILIDAD.md`; el
contexto completo del proyecto y el estado de cada sprint, en
`CLAUDE.md`.
