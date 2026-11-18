# Pruebas de Huella Blanca

Hay dos niveles.

## Unitarias — `npm test`

Sin red ni base de datos real. Tardan un par de segundos y se pueden correr
siempre. Usan el runner que trae Node (`node:test`); la del esquema usa PGlite
(PostgreSQL en WebAssembly), única dependencia de desarrollo de las pruebas.

| Archivo | Qué protege |
|---|---|
| `unit/telefono.test.mjs` | TRA05: el teléfono se guarda en formato internacional (E.164); si no, los botones de llamar y WhatsApp de la ficha marcan un número inexistente. |
| `unit/codigoQR.test.mjs` | `/escanear` solo sigue links de la propia app; un QR con `javascript:` o `data:` se rechaza. |
| `unit/textoBusqueda.test.mjs` | IA03: el texto para compartir no incluye teléfono, domicilio ni el mensaje privado del dueño; señas solo si son públicas; ubicación redondeada. |
| `unit/esquema.test.mjs` | `supabase/esquema/esquema.sql` reconstruye la base en un PostgreSQL vacío (PGlite, en memoria) y un recorrido de humo funciona: ficha sin domicilio, escaneo lejos de casa que abre el caso y avisa, contacto solo con caso abierto, `rol` protegido, teléfono E.164. |

## De punta a punta — `PRUEBAS_EN_PRODUCCION=si npm run test:e2e`

Recorren la app real: la API de Supabase, las Edge Functions, los triggers y,
con Chrome sin ventana, las pantallas. **Corren contra la base de producción**
(no hay un proyecto de pruebas aparte), por eso no arrancan sin la variable
`PRUEBAS_EN_PRODUCCION=si`.

Cómo cuidan los datos reales:

- Cada prueba crea sus propias cuentas (`prueba-…@example.com`), mascotas y
  placas, y las borra al terminar, aunque falle.
- Las que tocan casos o avisos usan mascotas temporales: nunca a Blanca ni a
  ninguna mascota real, y no le llega ningún push al dueño real.
- Comparan la base con una línea base al empezar y al terminar.
- `correr.mjs` pasa antes y después `limpiar.mjs`, que borra restos de pruebas
  cortadas a mitad de camino (por ejemplo, por un error de red): solo cuentas
  `prueba-…@example.com` y placas con código de prueba (`T…`, `PP…`; las reales
  son hexadecimales). También se puede correr solo: `PRUEBAS_EN_PRODUCCION=si npm run test:limpiar`.

Requisitos:

- `npx supabase login` hecho y el proyecto vinculado. Las claves se piden al CLI
  en cada ejecución; no están en el repositorio ni se imprimen.
- Google Chrome instalado (o `CHROME_PATH` apuntando al ejecutable).
- `python3` para `eliminar-cuenta.py`.
- `correr.mjs` reconstruye el build de producción y lo sirve con `vite preview`
  (4173) con los mismos encabezados que Vercel: las pruebas de pantalla corren
  contra lo mismo que se publica. Con `BASE=https://huella-blanca.vercel.app`
  se prueba directamente producción.

Para correr solo algunas: `PRUEBAS_EN_PRODUCCION=si npm run test:e2e -- telefono push`.

| Archivo | Qué protege |
|---|---|
| `e2e/seguridad-rol.mjs` | Una cuenta común no puede crearse ni cambiarse el rol a `admin` (agujero corregido el 2026-11-17). |
| `e2e/bajas-logicas.mjs` | Un dueño no puede borrar sus mascotas, casos ni avisos con la API (sí darlos de baja o cerrarlos); `anon` no puede llamar a las funciones que necesitan cuenta. |
| `e2e/limite-ia.mjs` | `sugerir-ficha` exige sesión; límite de 30 clasificaciones por hora con Claude. |
| `e2e/notificaciones.mjs` | PER04/PER03: qué hechos avisan al dueño, el envío por la Edge Function y la baja de suscripciones muertas. |
| `e2e/limite-push.mjs` | Límite de frecuencia de los push; "Está conmigo" prioritario; tope de 20 avisos por hora. |
| `e2e/eliminar-cuenta.py` | Eliminar una cuenta desde `/admin/cuentas` borra todo lo suyo y no toca a nadie más. |
| `e2e/placas.mjs` | Tras retirar las placas por lote: una placa sin mascota no se reconoce ni se puede "activar"; las funciones retiradas no existen; el panel crea el código QR de una mascota que quedó sin él. |
| `e2e/recuperar-contrasena.mjs` | `/recuperar` responde igual exista o no la cuenta; el enlace del email lleva a `/restablecer` aunque Supabase vuelva al inicio; la contraseña nueva entra y la vieja no. |
| `e2e/telefono.mjs` | TRA05 en pantalla: `/perfil`, `/registro`, perfil diferido y el check de la base. |
| `e2e/ficha-avisos.mjs` | PER07 (mensaje del dueño en la ficha), TRA11 (aviso sin ubicación), TRA09 (reclamo del aviso). |
| `e2e/ejemplo-escalado.mjs` | `/ejemplo` no toca la base; escaneos del dueño ignorados; texto del caso escalado solo. |
| `e2e/rescatista.mjs` | Al cerrar el caso el dueño elige a quién agradecer ("Está conmigo" preseleccionado); el rescatista solo puede ser alguien que avisó en ese caso; el navegador no escribe `rescatista_id`. |
| `e2e/fotos-ia.mjs` | IA02: verificación de fotos en el servidor, pase firmado, subida directa bloqueada, foto de reencuentro. |
| `e2e/fotos-storage.mjs` | Reemplazar una foto borra la anterior; un guardado que falla borra la recién subida. |
| `e2e/estadisticas.mjs` | DAT05: `/admin/estadisticas` muestra los totales reales. |
| `e2e/admin-cuentas.mjs` | La pantalla de cuentas del administrador y su confirmación. |
| `e2e/privacidad.mjs` | Ley 25.326: la política está y enlazada; el registro exige el consentimiento y avisar no; la fecha de aceptación se guarda; cada persona elimina su propia cuenta y no queda nada suyo (sus avisos sobre mascotas ajenas quedan anónimos); un admin no puede borrarse a sí mismo. |
| `e2e/encabezados.mjs` | Los encabezados de seguridad de `vercel.json` están, y la política de contenido no bloquea nada: recorre todas las pantallas (mapas, fotos, cámara del lector, afiche, gráficos) y falla ante cualquier violación que reporte el navegador. |
| `e2e/push.mjs` | Web Push de punta a punta: activar avisos, escaneo lejos de casa, notificación mostrada. |

Las pruebas de IA (`fotos-ia`, `limite-ia`) necesitan la foto de un animal real:
bajan la foto pública de una mascota (perro) ya cargada en la app, la misma que
ve cualquiera en su ficha; no se guarda en el repositorio.
