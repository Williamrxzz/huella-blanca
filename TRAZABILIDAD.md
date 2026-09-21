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

## 2026-09-18 — Simplificación de alcance: se retira el circuito de agradecimientos

El bloque de reconocimiento (comercios adheridos, refugios, códigos de
canje, validación en el local, configuración de aportes) terminó
ocupando más pantallas de administración que la funcionalidad central
del producto, y depende de acuerdos con comercios reales que están
declarados fuera del alcance del proyecto desde el documento de
Historias de Usuario. Un sistema que no puede funcionar sin esos
acuerdos no debería formar parte de esta versión.

Se reduce el reconocimiento a lo que efectivamente aporta y no depende
de terceros: que quede registrado que una persona ayudó y que el dueño
pueda agradecerle (REC01, REC02, TRA09/REC09), todo dentro del propio
sistema.

**Se descartan del alcance** las siguientes historias:

- REC03, REC04, REC05, REC06, REC07
- COM01, COM02, COM03
- ADM04, ADM05, ADM09, ADM10, ADM12
- DAT04

De estas, **REC04, ADM04, ADM05, ADM09 y ADM12 llegaron a construirse
y probarse en vivo** durante el Sprint 4; se retiran por esta decisión
de alcance, no porque hayan fallado o estuvieran mal implementadas.

**Cambios en el esquema**: se eliminaron las tablas `comercios`,
`agradecimientos`, `canjes` y `refugios`, junto con las funciones
`generar_canje()` y `validar_canje()`. La base pasa de diez a seis
entidades: `perfiles`, `mascotas`, `placas`, `casos_perdida`,
`escaneos`, `avistamientos`. El rol `'comercio'` de `perfiles.rol` se
elimina (las cuentas que lo tenían pasan a `'usuario'`); los roles
válidos quedan en `'usuario'` y `'admin'`. La función
`historial_rescatista()` se reescribió para no depender de las tablas
eliminadas, manteniendo su carácter `security definer` y sin exponer
nunca domicilio ni coordenadas de la mascota — el motivo por el que
existe en primer lugar no cambió.

**Cambios en el código**: se eliminaron `AdminComercios.jsx`,
`AdminAgradecimientos.jsx`, `AdminRefugios.jsx`, `ComercioValidarCanje.jsx`
y el componente `NavAdmin` (con una sola pantalla de administración
restante, `/admin/placas`, dejó de tener sentido). `/mi-historial`
queda solo con el historial de avisos y reencuentros, incluyendo el
mensaje y la foto de agradecimiento que deja el dueño (REC02), sin
ningún dato de canje.

## 2026-09-21 — ADM01: de parcial a terminada, con generación de lotes y activación

Se completa **ADM01** ("generar lotes de códigos QR únicos y
aleatorios para producir las placas físicas, sin que las fichas
puedan encontrarse probando códigos"), con el circuito completo:

1. **Generación de lotes** — `generar_lote_placas(p_cantidad int)`,
   nueva función `security definer`: verifica el rol admin **dentro**
   de la función (no alcanza con proteger la pantalla), genera hasta
   50 placas por lote en estado `sin_asignar` sin mascota, con la
   misma lógica de código aleatorio y el mismo manejo de colisión que
   `generar_placa()`. En `/admin/placas`, un formulario "Generar
   lote" muestra los códigos nuevos con su QR (nivel `H`) y permite
   descargarlos para imprimir.

2. **Activación** — `ficha_publica()` distingue ahora "código
   inexistente" (`{"encontrada": false}`, como siempre) de "placa
   existente sin mascota" (`{"encontrada": false, "sin_activar":
   true}`), sin exponer nada de una mascota que no existe.
   `FichaPublica.jsx` muestra "Esta placa todavía no está activada"
   con un botón "Activar esta placa": sin sesión, lleva a
   `/registro?placa=CODIGO` (o a `/login?placa=CODIGO` desde el link
   "Ya tengo cuenta", propagando el mismo parámetro); con sesión,
   lleva directo a `/mascotas/nueva?placa=CODIGO`. `AltaMascota.jsx`
   usa `vincular_placa()` en vez de `generar_placa()` cuando hay un
   código de activación pendiente, así el dueño no escribe el código
   a mano. Si el registro queda pendiente de confirmar el email, el
   código se guarda en `localStorage` (`placaPendiente`) y `Panel.jsx`
   lo retoma en el primer ingreso logueado, con el mismo mecanismo que
   ya existía para `avisoPendienteId` (TRA09).

Se mantiene sin cambios que **quien encuentra una mascota nunca se
registra** — la activación es un paso del futuro *dueño* al recibir
una placa en blanco, un rol distinto del transeúnte que escanea una
placa ya activa.

Probado en un navegador real, con clics reales, el circuito completo:
generar un lote de 3 como admin → escanear uno de los códigos sin
sesión (muestra "todavía no está activada") → tocar "Activar" (lleva
a `/registro?placa=...`) → cargar una mascota con sesión y el código
de activación en la URL (queda vinculada, sin escribirla a mano) →
reescanear sin sesión (ahora aparece la ficha completa). El paso de
registro con confirmación de email real no se probó de punta a punta
en este entorno (no se puede confirmar un email desde acá); se
verificó en cambio que el código de activación se propaga
correctamente por `user_metadata`/`localStorage` en ambos caminos
(sesión inmediata y diferida), igual que ya se hacía para TRA09.

También se confirmó que el formulario de vincular placa que ya existía
en el panel sigue funcionando sin cambios con un código de lote.

## 2026-09-21 — IA01 + IA02 construidas; IA03 pasa al backlog

Se acorta el Grupo D del Sprint 4 a **IA01 e IA02**, en una sola Edge
Function (`supabase/functions/sugerir-ficha`), la misma foto y el
mismo pedido a Claude Haiku para las dos historias a la vez. **IA03**
(texto de búsqueda para compartir al reportar la pérdida) **queda
pendiente en el backlog, no descartada** — se retoma más adelante.

La función devuelve `categoria` ("apta" | "incorrecta" |
"inapropiada") en vez de un booleano, porque la historia distingue dos
problemas distintos y el sistema los trata distinto en
`AltaMascota.jsx`:
- **"incorrecta"** (no se distingue un animal, foto borrosa u oscura):
  solo **advertencia**. El dueño puede seguir igual — un falso
  positivo de la IA no puede dejar a alguien sin poder registrar a su
  mascota.
- **"inapropiada"** (contenido ofensivo, violento o sexual): **bloqueo**
  real, se descarta la foto y hay que elegir otra — se justifica
  porque la ficha es pública.
- Si la Edge Function no responde (falla, timeout, sin crédito): se
  sigue sin verificar, sin bloquear nada. Evita la asimetría de que el
  sistema termine siendo más estricto cuando la IA funciona que cuando
  está caída.

`especie` y `tamano` se normalizan dentro de la función contra los
mismos valores que aceptan los checks de la tabla `mascotas`; si el
modelo devuelve algo fuera de esa lista, el campo vuelve vacío en vez
de arriesgar el guardado. El prompt pide explícitamente que "señas"
describa solo rasgos físicos permanentes (manchas, cicatrices, forma
de orejas o cola) y nunca la pose o el momento de la foto.

El análisis solo corre al **cargar** una mascota nueva, no al editar
una existente, para no pisar datos reales con una sugerencia.

Probado: con la foto real de una mascota (categoría "apta", sugerencia
aplicada a los campos del formulario, sin datos de pose en "señas");
con una imagen que no es una foto de mascota (categoría "incorrecta",
solo advertencia). La categoría "inapropiada" **no se probó con
contenido real** — se verificó el bloqueo en la pantalla simulando
temporalmente esa respuesta en el código, y se sacó la simulación
antes de commitear.

Instalación de la CLI de Supabase como devDependency del proyecto
(`npm install supabase --save-dev`) para poder desplegar Edge
Functions sin depender de Homebrew ni de actualizar las Command Line
Tools de Xcode, que fallaba en esta máquina.

## 2026-09-19 — Resto de la simplificación: historial_rescatista() renombrada

Al retirar el circuito de comercios (2026-09-18) desapareció el rol
`'comercio'` de `perfiles.rol`, pero quedó un resto suelto: la función
`historial_rescatista()` seguía llamándose así aunque "rescatista" ya
no es un rol del sistema — nunca lo fue en `perfiles.rol` (los roles
son `'usuario'` y `'admin'`); ser rescatista es simplemente haber
avisado alguna vez, registrado en `avistamientos.reportado_por`.

Renombrada a `historial_colaboracion()` (`alter function ... rename
to`, conserva `security definer`, el cuerpo y los permisos sin
cambios). Actualizada la llamada en `HistorialRescatista.jsx`
(`supabase.rpc('historial_colaboracion')`). Verificado en vivo: la
función nueva responde bien y la vieja ya no existe.

Se revisó todo `src/` buscando texto **visible en pantalla** que
hablara de "rescatista" como si fuera un rol — no apareció ninguno;
`/mi-historial` ya decía "Tu colaboración" desde antes. Quedan sin
tocar, a propósito, tres identificadores internos que no son texto de
pantalla ni afirman un rol: el archivo/componente
`HistorialRescatista.jsx`, la columna `casos_perdida.rescatista_id` y
la variable `avistamientoConRescatista` en `MapaAvistamientos.jsx` —
esta columna solo guarda quién queda acreditado por un reencuentro (FK
a `perfiles`), sin relación con `perfiles.rol`.

## 2026-09-19 — TRA05: el teléfono no se podía cargar, y limitación conocida del botón de contacto

Al revisar el código real de TRA05 (dada por terminada desde el
Sprint 3) apareció que estaba rota para cualquier dueño real:
`perfiles.telefono` existe desde el Sprint 1, pero ninguna pantalla lo
pedía ni lo dejaba editar. El único perfil que tenía un número cargado
lo tenía porque se insertó a mano por SQL para poder probar la
historia en su momento — no porque un dueño lo hubiera cargado desde
la app. Se corrigió con:
- teléfono opcional en `/registro` (no bloquea el alta),
- pantalla nueva `/perfil` para cargarlo o corregirlo después,
- un aviso cerrable (no bloqueante) en `/panel` para quien tiene
  mascotas cargadas y no tiene teléfono.

**TRA05** ("contactar al dueño mediante un botón de llamada o mensaje,
sin que su número quede visible en pantalla") se implementa con
enlaces `tel:` y `wa.me:` armados por `ficha_publica()`
(`contacto_tel`, `contacto_whatsapp`). Estos esquemas necesitan el
número real dentro del `href` para que el sistema operativo pueda
disparar la llamada o abrir WhatsApp — no existe una forma de que el
botón funcione sin que el dato llegue al navegador en algún momento.

Esto significa que el número del dueño **sí viaja al navegador**,
dentro del HTML/JSON de la página, aunque nunca se renderiza como
texto legible en pantalla. Alguien que abra las herramientas de
desarrollador y busque a propósito podría verlo — es una limitación
del mecanismo (`tel:`/`wa.me:`), no del diseño ni un descuido de
implementación.

Mitigación aplicada: `ficha_publica()` solo incluye `contacto_tel` y
`contacto_whatsapp` en el JSON cuando la mascota tiene un caso de
pérdida abierto (`perdida` o `posible_perdida`) — antes los devolvía
siempre que el dueño tuviera teléfono cargado, sin importar el estado
de la mascota. El botón en `FichaPublica.jsx` ya estaba condicionado a
que la mascota estuviera perdida, pero eso no alcanzaba: el dato
viajaba igual en cada escaneo, esté la mascota perdida o no. Con este
cambio, el número solo sale de la base cuando corresponde.

Corrige además una frase desactualizada del documento de Diseño de
Base de Datos, que dice que `ficha_publica()` "nunca devuelve el
teléfono" — eso era cierto antes de construir TRA05 en el Sprint 3, y
dejó de serlo desde que existe el botón de contacto.

## 2026-09-19 — "Ver QR" corrige un hueco de DUE03, no agrega una historia nueva

Al probar el circuito completo de TRA05 apareció que **DUE03**
("vincular una placa QR a la ficha de mi mascota") estaba incompleta
en la práctica: la placa se generaba y vinculaba bien en la base
(`generar_placa()`), pero para una mascota ya cargada no existía
ninguna forma de llegar al QR para imprimirlo — solo se mostraba una
vez, en el momento de crear la mascota. Sin QR impreso en la chapita,
el sistema no arranca: es el punto de partida de todo el producto.

El enlace "Ver QR" agregado en `/panel` (commit `bdf3685`) no es una
mejora de UX opcional, es lo que le falta a DUE03 para funcionar de
punta a punta. Se verificó además que:
- `/placas` no queda como una ruta suelta: converge en una sola
  implementación (`GeneradorQR.jsx`) con tres entradas legítimas
  (enlace público desde el inicio, redirección post-alta, y ahora
  "Ver QR" desde el panel) — no hay dos caminos distintos para lo
  mismo.
- La descarga genera un PNG real, no solo una vista en pantalla.
- El nivel de corrección de errores del QR quedó en el valor por
  defecto de la librería (`'L'`, el más bajo) — poco robusto para un
  código que va a vivir en una chapita expuesta a roce, tierra y agua.
  Corregido a `'H'` (tolera hasta 30% de daño, contra 7% de `'L'`):
  el código de la mascota va colgado del cuello, expuesto a barro,
  agua y roce constante; que quede más denso no afecta la lectura
  desde un teléfono a pocos centímetros.

## 2026-09-19 — DAT01: se registraba solo un subconjunto de los escaneos

Al verificar DAT01 ("registrar cada escaneo de placa — fecha, hora,
ubicación aproximada — para conocer el uso del sistema") contra el
texto exacto de la historia, apareció que `FichaPublica.jsx` solo
llamaba a `registrar_escaneo()` cuando el navegador **ya tenía**
permiso de ubicación concedido de antes; sin ese permiso previo, la
llamada ni se intentaba, y el escaneo no dejaba ningún rastro — ni
fecha ni hora. Para alguien que escanea el QR de una mascota por
primera vez (el caso más común), lo probable es no tener ese permiso
ya concedido a este dominio, así que la mayoría de los escaneos reales
quedaban fuera del conteo.

Corregido: `registrarEscaneo()` ahora llama a `registrar_escaneo()`
siempre, pasando `null` en `p_lat`/`p_lng` cuando no hay ubicación
disponible, sin pedir el permiso de golpe (sigue usando
`pedirUbicacionSiYaHayPermiso`, que nunca dispara el cartel del
navegador). `registrar_escaneo()` ya toleraba lat/lng nulos sin error
y sin abrir un caso falso — se verificó por RPC directa antes de tocar
el frontend, y de nuevo en un navegador real con un perfil sin permiso
de ubicación concedido.

## 2026-09-19 — ADM01 y DUE05 cumplidas parcialmente; corrección de seguridad en /placas

**ADM01** ("generar lotes de códigos QR únicos y aleatorios... para
producir las placas físicas") se da por **cumplida parcialmente**. La
parte sustantiva de la historia —que los códigos sean aleatorios y no
correlativos, para que las fichas no puedan enumerarse probando
valores consecutivos— está cumplida: `generar_placa()` genera un
código aleatorio de 8 caracteres por mascota, uno por vez, al darla de
alta. La generación de **lotes por adelantado**, sin mascota asociada,
no se construye: corresponde a la producción física de placas, que el
documento de Historias de Usuario declara explícitamente fuera del
alcance del proyecto.

Al verificar ADM01 apareció además una falla de seguridad real, ya
corregida: `/placas` era una pantalla pública con un campo de texto
libre, así que cualquiera podía escribir el código de la placa de otra
persona y descargarse el QR de esa mascota. Se corrigió para que
requiera sesión iniciada y solo muestre el código de una placa
vinculada a una mascota del usuario logueado (la política de RLS de
`placas` ya lo permitía sin cambios); si el código no es del usuario,
muestra "no tenés acceso". Se sacó el campo de texto libre: ahora solo
se llega desde el redirect post-alta o "Ver QR" del panel. Verificado
en un navegador real, con clics reales, en tres escenarios: sin
sesión, logueado sin ser dueño de la placa, y el dueño real.

**Actualización del 2026-09-21: ADM01 pasó de parcial a terminada** —
ver la entrada de esa fecha más abajo. La generación de lotes sí se
construyó, con otro criterio: es una herramienta de trabajo interna
(imprimir placas antes de tener dueño), no "producción física" en el
sentido de fabricar o vender placas, que es lo que el documento de
Historias de Usuario excluye.

**DUE05** ("definir qué datos son públicos y cuáles solo se muestran
cuando la mascota está perdida") se da por **cumplida parcialmente**,
sin construir nada nuevo. El dueño sí decide sobre un dato concreto:
el checkbox `mostrar_salud` en el alta de la mascota controla si la
información de salud es pública o no. El resto del gating por estado
de pérdida (contacto, última ubicación, mensaje) es una regla fija del
sistema, no configurable campo por campo — se decide así a propósito:
hacerlo configurable agregaría complejidad al formulario de alta sin
un beneficio claro, y una regla fija protege mejor al usuario que una
configuración que puede equivocarse (por ejemplo, dejar expuesto el
contacto por error en un dueño que no entendió la opción).

## 2026-09-16 — ADM08 descartada: la acción del agradecimiento no necesitaba ser configurable

**ADM08** se descarta del alcance. Hacer configurable qué acción
habilita un agradecimiento agregaba complejidad sin valor, porque la
regla era fija (un reencuentro habilita un agradecimiento, sin
variantes). Se eliminaron la tabla `acciones_agradecimiento` y la
columna `agradecimientos.accion_id` que existían para soportar esa
configurabilidad. Esta decisión es anterior y separada de la
simplificación del 2026-09-18: en aquel momento se mantenía el
circuito de comercios, solo se sacó la parte de ADM08 que lo hacía
innecesariamente configurable.

## Historias con alcance reducido por el cambio de modelo

- **REC05** — "Como rescatista, quiero poder donar el agradecimiento a
  un refugio o a la mascota que encontré, en lugar de usarlo yo."
  (Alta). Menciona dos destinos posibles. El primero, donar a un
  refugio, quedó cubierto en REC04 (`generar_canje` con
  `p_accion = 'donar'`, estado `donado` y `refugio_id`). El segundo,
  donárselo a la mascota encontrada, quedó sin sentido con el cambio de
  modelo de agradecimientos: tenía lógica cuando el agradecimiento era
  un producto físico de una forrajería para el propio animal; ahora que
  el agradecimiento es una placa QR grabada, la mascota encontrada ya
  tiene la suya. REC05 se da por **terminada en su parte aplicable**,
  con esta salvedad documentada; no se construyó nada nuevo para el
  segundo destino.
