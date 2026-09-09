# Trazabilidad de commits ↔ historias de usuario

Tabla armada revisando el código real de cada commit contra el texto
de las historias (no contra lo que decía el propio mensaje de commit).
Cuando la historia real coincide con la del mensaje, se marca **OK**.
Cuando no, se marca **MAL ETIQUETADO** con la corrección. Cuando no se
tiene el texto exacto de la historia para confirmar, se marca
**DUDOSO**. Los commits sin código de historia (docs, chore, fix de
infraestructura) se listan como `—`.

| Hash | Mensaje original | Historia que implementa realmente |
|---|---|---|
| `36aaee3` | TRA01: ficha pública de la mascota conectada a Supabase | TRA01 — OK |
| `60a42b6` | ADM01: generador de QR para placas | ADM01 — DUDOSO. Es una página pública (`/placas`), sin rol de administrador real detrás. |
| `80a19a5` | TRA11: aviso "La vi acá" con ubicación GPS o referencia manual | TRA11 — OK |
| `3e0bfa4` | chore: agregar qrcode.react a package.json | — (infraestructura) |
| `4fe278c` | docs: agregar CLAUDE.md con el contexto del proyecto | — (documentación) |
| `94880e6` | fix: reescritura SPA en Vercel para que /m/:codigo y /placas no den 404 | — (infraestructura) |
| `8168194` | docs: actualizar CLAUDE.md con el estado real del proyecto | — (documentación) |
| `6573523` | DUE01: login del dueño y panel con listado de sus mascotas | DUE01 — DUDOSO (probable OK; no se tiene el texto exacto). |
| `1c5c9f1` | DUE02: alta de mascota con mapa, foto y sexo | DUE02 — DUDOSO (probable OK). |
| `a4af3f3` | DUE03: generar placa automáticamente al cargar una mascota | DUE03 — DUDOSO (probable OK). |
| `1d861b8` | docs: actualizar CLAUDE.md con login, alta de mascota y placas automáticas | — (documentación) |
| `586834d` | DUE04: eliminar mascota (borrado lógico) desde el panel | **MAL ETIQUETADO.** DUE04 real: "indicar el carácter de mi mascota para orientar a quien la encuentre" (ver `1c5c9f1`/AltaMascota.jsx). El borrado lógico no tiene código de historia confirmado en este documento. |
| `3568137` | PER08: mapa de avistamientos y edición de mascota | **MAL ETIQUETADO.** PER08 real: "marcar a mi mascota como recuperada para cerrar el caso" (ver `806afe9`). El mapa de avistamientos no tiene código confirmado (posible PER05, sin verificar); la edición de mascota tampoco. |
| `408b15c` | docs: actualizar CLAUDE.md con mapa de avistamientos y edición de mascota | — (documentación) |
| `e439d2a` | DUE04: botones de acción prolijos y cartel de confirmación propio | **MAL ETIQUETADO.** Mismo caso que `586834d`: es UI del borrado lógico, no la historia de carácter. |
| `b2bb3a3` | DUE01: configurar PWA instalable con vite-plugin-pwa | **MAL ETIQUETADO.** Es infraestructura (instalabilidad), no la historia de login. Sin código de historia confirmado. |
| `28df5d0` | docs: actualizar CLAUDE.md con la PWA instalable | — (documentación) |
| `cde4a49` | TRA04: registrar el escaneo silenciosamente si ya hay permiso de ubicación | TRA04 — OK |
| `98d2142` | docs: actualizar CLAUDE.md con TRA04 (registro silencioso de escaneo) | — (documentación) |
| `d833ff4` | DUE01: pulir pantalla de inicio para la entrega | **MAL ETIQUETADO.** Cosmético (pantalla de inicio), no la historia de login. Sin código de historia confirmado. |
| `61d6316` | DUE01: fondo con patrón sutil de huesitos y huellas en el inicio | **MAL ETIQUETADO.** Mismo caso que `d833ff4`. |
| `c6994bf` | accesibilidad: lang correcto, aria-label en campos y diálogo modal | — (transversal, sin historia) |
| `3795f1e` | TRA02: escáner de QR en la app y redirección directa al panel | TRA02 — DUDOSO. El QR ya apunta a una URL: cualquier cámara de celular lo lee sin código propio desde que existe `GeneradorQR.jsx`. Este lector es un agregado solo para la demo, no la implementación de la historia en sí. |
| `114b288` | TRA01: saludo con el nombre de la mascota en la ficha pública | TRA01 — OK (extensión legítima) |
| `307bb93` | docs: actualizar CLAUDE.md con el escáner en app, la redirección de sesión y el saludo de la ficha | — (documentación) |
| `c1311d1` | TRA11: mapa para marcar el aviso y alerta de pérdida más clara | TRA11 — OK (extensión legítima) |
| `4743b5f` | DUE01: crear cuenta de dueño (registro) para el prototipo | DUE01 — DUDOSO. Reutiliza el mismo código que `6573523` (login); si DUE01 cubre también la creación de cuenta, es correcto — si no, falta identificar el código real. |
| `d5c9a17` | docs: actualizar CLAUDE.md con el registro de dueños y el mapa del aviso | — (documentación) |
| `5f8c43e` | PER01: marcar mascota como perdida manualmente desde el panel | PER01 — OK (confirmado contra el texto real de la historia) |
| `806afe9` | PER08: marcar mascota como recuperada y cerrar el caso desde el mapa | PER08 — OK (confirmado contra el texto real de la historia; nota: reutiliza un código ya usado antes en `3568137` para otra función) |
| `251b323` | docs: actualizar CLAUDE.md con el estado real verificado del MVP | — (documentación) |
| `007990d` | PER03: descartar la sospecha de pérdida | PER03 — OK (detección automática / confirmar o descartar la sospecha) |

## Resumen de los problemas encontrados

- **Códigos reutilizados para funciones distintas:** `DUE01` (login, registro, PWA, estética del inicio — cuatro cosas sin relación) y `DUE04` (carácter de la mascota vs. borrado lógico). `PER08` aparece dos veces para dos funciones opuestas entre sí.
- **Funcionalidad construida sin código de historia identificado:** borrado lógico de mascota, edición de mascota, instalabilidad PWA, estética de la pantalla de inicio, accesibilidad.
- **Verificadas contra el texto real de la historia** (las únicas cuatro de las que se tuvo el texto oficial): `DUE04`, `PER01`, `PER04` (no implementada) y `PER08`.
