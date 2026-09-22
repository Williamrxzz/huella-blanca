# Plan de pruebas manual — Huella Blanca

Se ejecutó manualmente el 20/09/2026, recorriendo el sistema como lo haría un usuario nuevo (no leyendo el código), con tres personajes en navegadores separados. Resultado: correcto en todos los pasos.

Usá dos navegadores distintos (o uno normal + uno en incógnito): uno para el **dueño** (con sesión) y otro para **quien encuentra la mascota** (sin sesión, nunca debe loguearse durante la Parte B).

---

## Parte A — Dueño nuevo, desde cero

**A1.** Ir a `/registro`. Cargar nombre, un email nuevo y contraseña. Dejar el teléfono vacío a propósito (se carga en A5, para probar antes el caso borde de "sin teléfono"). Enviar.
- Ver: cuenta creada. Si el proyecto pide confirmar el email, pantalla "Revisá tu email"; si no, entra directo a `/panel` vacío.
- Historia: DUE01.

**A2.** Confirmar el email si hace falta y loguearse en `/login`.
- Ver: entra a `/panel`.
- Historia: DUE01.

**A3.** Tocar "Cargar mascota". Completar todos los campos: nombre, especie, sexo, raza, tamaño, color, señas, carácter, foto, domicilio (tocando el mapa) y radio. Guardar.
- Ver: pantalla "¡Mascota cargada!" con el QR ya armado.
- Historia: DUE02, DUE03, DUE09 (domicilio), DUE10 (radio).

**A4.** En esa misma pantalla, tocar "Descargar QR".
- Ver: se descarga un archivo `placa-XXXX.png` con el código QR.
- Historia: DUE03 (corrección "Ver QR").

**A4bis — caso borde, dueño sin teléfono.** Sin cargar el teléfono todavía, anotar el código de la placa (o volver a `/panel` y tocar "Ver QR"). Guardarlo, se usa en la Parte B.

**A5.** Volver a `/panel`, tocar "Tu perfil". Cargar el teléfono. Guardar.
- Ver: "Cambios guardados."
- Historia: TRA05 (parte del dueño).

**A6.** Volver a `/panel`.
- Ver: si antes aparecía el aviso ámbar "Cargá tu teléfono...", ya no está.
- Historia: TRA05.

---

## Parte B — Alguien encuentra la mascota, sin cuenta, otro navegador

Todo este bloque sin loguearse.

**B1.** Abrir `/m/CODIGO` (el de A4) como si fuera la primera vez que se escanea — no dar permiso de ubicación al navegador todavía.
- Ver: la ficha carga normal (nombre, foto, especie, etc.). No pide permiso de ubicación de entrada.
- No tiene que verse: domicilio, teléfono escrito, botón de contacto (la mascota está "en casa", sin caso abierto).
- Historia: TRA01, TRA04, DAT01 (el escaneo se registra igual, sin ubicación).

**B2 — caso borde, placa inexistente.** Abrir `/m/CODIGOFALSO123` (inventado).
- Ver: mensaje de que no se encontró, sin pantalla rota.
- Robustece TRA01.

**B3.** Volver a la ficha real. Tocar "La vi acá". Cuando el navegador pida permiso de ubicación, concederlo. Elegir "La vi pasar", escribir un mensaje y un contacto, enviar.
- Ver: confirmación de aviso enviado.
- Historia: TRA06, TRA11 (con GPS).

**B4.** Dejar pasar unos segundos y volver a abrir la ficha — este segundo escaneo ya debería registrar ubicación sola, sin pedir nada.
- Historia: TRA04 (registro silencioso con permiso ya concedido).

**B5.** Dentro de la ficha, tocar "La vi acá" otra vez, pero esta vez tocar el mapa a mano para marcar el lugar en vez de esperar el GPS.
- Ver: el marcador aparece donde se tocó.
- Historia: TRA11 (marcado manual).

**B6.** Después de enviar ese aviso, cuando aparezca la oferta de crear cuenta, aceptarla con un email nuevo.
- Ver: cuenta creada (o "revisá tu email" si corresponde).
- Historia: TRA09.

**B7.** Confirmar el email si hace falta y loguearse con esa cuenta nueva.
- Ver: entra normal a `/panel` (sin mascotas propias, es la cuenta del rescatista).
- Historia: REC09 (el aviso dado sin cuenta debería quedar asociado a este perfil).

---

## Parte C — El dueño gestiona la pérdida

Volver al navegador/sesión de la Parte A.

**C1.** Entrar a `/panel` y mirar la mascota.
- Si alguno de los avisos de la Parte B cayó fuera del radio configurado en A3, la mascota ya debería figurar en un estado de sospecha (seguir a C2). Si no, saltar a C4 y marcarla perdida a mano.

**C2 (si hay sospecha automática).** Ir al mapa de la mascota.
- Ver: alerta ámbar "Podría estar perdida".
- Historia: PER02, y del lado del transeúnte TRA03.

**C3.** Tocar "No, está conmigo" para descartar la sospecha.
- Ver: la alerta desaparece.
- Historia: PER03.

**C4.** Marcar la mascota como perdida a mano desde `/panel`, con un mensaje.
- Ver: "Perdida — buscando" en el panel.
- Historia: PER01, PER07.

**C5.** Desde el navegador de la Parte B, volver a abrir `/m/CODIGO`.
- Ver: cartel rojo "Reportada como perdida" y el botón de llamar/WhatsApp.
- No tiene que verse: el número de teléfono escrito en ningún lado — solo el botón.
- Historia: TRA05 (corrección de privacidad).

**C6.** Desde `/panel`, entrar al mapa de la mascota.
- Ver: los avisos de la Parte B, con fecha/hora y el contacto dejado.
- Historia: PER05, PER06.

**C7.** Tocar "{nombre} volvió a casa". Escribir un mensaje de agradecimiento y subir una foto. Confirmar.
- Ver: el caso se cierra.
- Historia: PER08, REC02.

**C8.** Volver a abrir `/m/CODIGO` una vez más.
- Ver: la ficha vuelve a estado normal, sin alerta ni botón de contacto.
- Confirma otra vez la corrección de TRA05.

**C9.** Con la cuenta del rescatista (Parte B7), entrar a `/mi-historial`.
- Ver: el reencuentro logrado, con el mensaje y foto de agradecimiento del dueño.
- Historia: REC01, REC02.

**C9bis.** Con la cuenta del dueño, entrar también a `/mi-historial` (aunque no haya avisado de nada).
- Ver: pantallas vacías y prolijas, sin errores.
- Robustece REC01.

---

## Parte D — Activación de una placa de lote (ADM01)

**D1.** Como administrador, generar un lote de placas desde `/admin/placas`.
- Ver: los códigos nuevos, cada uno con su QR descargable.
- Historia: ADM01.

**D2 — caso borde, placa sin activar.** Sin sesión, abrir `/m/CODIGO` de una de las placas del lote.
- Ver: "Esta placa todavía no está activada", con el botón "Activar esta placa" — nunca el mensaje de "no reconocida".
- Historia: ADM01.

**D3.** Tocar "Activar esta placa" sin sesión.
- Ver: lleva a `/registro` conservando el código.
- Historia: ADM01.

**D4.** Registrarse (o loguearse) y cargar los datos de la mascota.
- Ver: la placa queda vinculada sin escribir el código a mano; pantalla de QR de confirmación.
- Historia: ADM01.

**D5.** Reabrir `/m/CODIGO` sin sesión.
- Ver: ahora aparece la ficha completa de la mascota.
- Historia: ADM01.

---

## Casos borde cubiertos

| Caso borde | Dónde se prueba |
|---|---|
| Escanear sin permiso de ubicación | B1 |
| Placa inexistente | B2 |
| Placa sin activar | D2 |
| Mascota sin foto | Cargar una segunda mascota de prueba sin subir foto; ver "Sin foto" en el panel y en la ficha pública, sin ícono roto. Eliminarla después desde el panel (baja lógica). |
| Dueño sin teléfono cargado | A4bis (repasar: si se hubiera marcado la mascota perdida antes de A5, la ficha no debería mostrar botón de contacto) |

**Fuera de este plan** (no tienen pantalla para clickear): DAT02 y DAT03 se verifican por SQL, no por la interfaz. IA03 todavía no está construida.
