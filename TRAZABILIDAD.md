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
| `007990d` | PER03: descartar la sospecha de pérdida | PER03 — **PARCIAL** (implementa solo "descartar"; "confirmar" ya existía con PER01. Faltan la alerta con la distancia y el paso automático a `perdida`; ver la entrada del 2026-10-25) |

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
- ADM04, ADM05, ADM06, ADM09, ADM10, ADM11, ADM12
- DAT04

De estas, **REC04, ADM04, ADM05, ADM09 y ADM12 llegaron a construirse
y probarse en vivo** durante el Sprint 4; se retiran por esta decisión
de alcance, no porque hayan fallado o estuvieran mal implementadas.

**ADM06** ("asignar un usuario de comercio") y **ADM11** ("crear
insignias") se agregan a esta lista el 2026-09-21, con un motivo
puntual cada una, no el motivo general del resto del bloque: ADM06
depende del rol `'comercio'`, que ya no existe en `perfiles.rol`
desde esta misma simplificación; ADM11 depende de REC06 (insignias
para quien colabora), que ya está descartada arriba. Ninguna de las
dos se llegó a construir. Con esto, el total de historias descartadas
del proyecto pasa a 17.

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

## 2026-09-21 — Verificación de los cinco documentos de entrega contra el código

Se leyeron los cinco PDF de `docs/` (Historias de Usuario v4, Diseño
de Base de Datos v3, Modelo de Datos v2, Product Backlog/Sprint Board
v3, User Story Mapping v3) y se cruzaron contra el código, la base y
este mismo documento. Coinciden en los cuatro números (34 terminadas,
1 parcial, 11 pendientes, 17 descartadas), en las 9 funciones + la
Edge Function, en las 6 tablas y sus columnas, en las 17 historias
descartadas con fecha y motivo, y en la lista de trabajo sin historia
asociada.

Dos afirmaciones puntuales del documento de Diseño de Base de Datos
se verificaron contra la fuente real, en vez de darlas por ciertas:

- **`mascotas.radio_metros` por defecto**: el documento decía `100`.
  `CLAUDE.md` tenía una contradicción interna (decía `1000` en un
  lugar y `100` en otro). Se confirmó por
  `information_schema.columns` que el valor real es `100` — se
  corrigió `CLAUDE.md`.
- **Modo paseo en `registrar_escaneo()`**: se leyó el código fuente
  completo de la función (`pg_get_functiondef`) y se confirmó que
  efectivamente respeta `pausado_hasta` antes de abrir un caso
  automático — no era una afirmación sin comprobar. Esto deja una
  nota útil para el Sprint 5: la mitad de DUE11 (modo paseo) ya está
  resuelta del lado de la base; solo falta la pantalla para que el
  dueño active `pausado_hasta`, no una función nueva.

Observación menor, sin corregir: DUE03 dice "vincular una placa
QR/NFC"; el sistema solo implementa QR, no hay nada de NFC en el
código ni en el stack. No se considera un error del documento — puede
leerse como el alcance aspiracional de la historia — pero queda
anotado por si la cátedra pregunta.

## 2026-09-21 — Limpieza final del Sprint 1: deuda técnica conocida, no corregida a propósito

Al preparar el commit final del Sprint 1 se revisó todo el proyecto
(archivos sin usar, imports muertos, `console.log`, comentarios sobre
conceptos ya retirados, y seguridad de credenciales — nada de eso
tenía nada pendiente salvo cinco archivos sueltos de la plantilla de
Vite, ya borrados: `src/App.css`, `src/assets/hero.png`,
`src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`).

Quedan dos errores de lint **preexistentes** (no introducidos en esta
limpieza, ya estaban documentados como conocidos en `CLAUDE.md`), que
se decide **no corregir antes de la presentación**, a propósito: el
código funciona y está probado, y no conviene tocar la carga de datos
del panel ni del mapa justo antes de mostrarlo. Quedan anotados como
deuda técnica para el Sprint 5:

- `src/pages/Panel.jsx` (línea ~337) — `react-hooks/set-state-in-effect`:
  el `useEffect` llama a `cargar()` (que hace `setState`) directamente
  en el cuerpo del efecto, en vez de manejarlo de otra forma. Trae
  además un warning de `exhaustive-deps` por la dependencia `cargar`
  faltante en el array.
- `src/pages/MapaAvistamientos.jsx` (línea ~117) — el mismo patrón:
  `useEffect(() => { cargar() }, [id, navigate])`, mismo error y mismo
  warning de dependencia faltante.

Arreglar esto bien requiere revisar cómo se dispara la recarga de
datos en las dos pantallas (por ejemplo, moviendo la lógica a una
función invocada por evento en vez de en el cuerpo del efecto, o
reestructurando con un flag), y no es un cambio de una línea — por
eso se pospone a un momento sin la presión de la entrega.

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

**Actualización del 2026-10-19: DUE05 pasó de parcial a completada.**
Ver la entrada del 2026-10-25 para la línea de tiempo.

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

## 2026-10-25 — Sprint 3: PER03 parcial y DUE05 completada después del cierre

Al armar las tarjetas del Sprint 3 (14 historias según el Product
Backlog v3) se verificó cada una contra el código, no contra el estado
que dicen los documentos. Resultado: doce quedaron como estaban,
una cambia de estado (PER03) y otra tiene fecha de cierre distinta de
la del sprint (DUE05).

**PER03 — de "Terminada" a Parcial.** El texto de la historia es:
"recibir una alerta con la distancia al domicilio y poder confirmar o
descartar la pérdida en un toque, para que el estado pase a perdida si
no respondo en el tiempo configurado". Cuatro partes:

| Parte | Estado | Dónde |
|---|---|---|
| Confirmar la pérdida en un toque | Hecha | `Panel.jsx`, botón "Confirmar pérdida" (actualiza el caso `posible_perdida` a `perdida`) |
| Descartar la sospecha en un toque | Hecha | `Panel.jsx`, botón "No, está conmigo" (`estado: 'descartada'`), commit `007990d` |
| Alerta con la distancia al domicilio | **Sin construir** | `registrar_escaneo()` calcula y guarda `escaneos.distancia_m`, pero no hay alerta al dueño ni pantalla que la muestre |
| Paso automático a `perdida` por tiempo | **Sin construir** | No hay trabajo programado, trigger ni columna de plazo; el dueño decide siempre a mano |

Lo que falta depende de la misma infraestructura que PER04 (un servicio
de correo o de notificaciones push, que hoy no está integrado), más un
trabajo programado que tampoco existe. Pasa al Sprint 5 junto con PER04.
Los PDFs de Historias de Usuario v4 y de Product Backlog v3 la dan por
Terminada; hay que corregirlos (ver abajo).

**DUE05 — línea de tiempo real.** Al cierre del Sprint 3 (tag
`sprint-3-entrega`, commit `d9f96dc`, 2026-09-19) seguía **Parcial**, y
así lo dice el mensaje de ese commit. Se completó el 2026-10-19:
`mascotas.visibilidad_senas` y `mascotas.visibilidad_salud` (`publico`,
`perdida` o `privado`), `ficha_publica()` actualizada y selectores en
`AltaMascota.jsx` (commits `6f031a9` y `5ca9cec`). No cuenta entre las
historias cerradas en la entrega del Sprint 3: es una corrección
posterior. Quedó aplicado también el cambio que deja de borrar el texto
de salud al ocultarlo. La columna `mostrar_salud` sigue en la base y se
elimina en una migración aparte.

**DUE07 — alcance real.** Los datos de salud son un único campo de
texto libre (`mascotas.salud`), no campos separados de vacunas,
medicación y alergias. Cubre la historia en su forma mínima.

**Correcciones pendientes en los PDFs de `docs/`** (no están en el
repositorio los archivos fuente, así que no se pueden editar desde acá;
hay que corregirlos en el documento original y volver a exportarlos):

- Historias de Usuario v4: PER03, de "Terminada" a "Parcial".
- Product Backlog v3, sección 3 (tabla del Sprint 3): PER03, de
  "Terminada" a "Parcial"; DUE05, de "Parcial" a "Terminada" con la
  fecha 2026-10-19.
- Product Backlog v3, sección 5 (hoja de ruta): Sprint 3 pasa de "13
  terminadas y DUE05 parcial" a "12 terminadas y PER03 parcial; DUE05
  completada el 2026-10-19".
- Product Backlog v3, sección 5 (Sprint 5): sumar lo que falta de PER03
  (alerta con la distancia al domicilio y paso automático a "perdida"
  por tiempo), junto a PER04.
- Product Backlog v3, sección 7: la nota "Historia cumplida
  parcialmente: DUE05" ya no vale; hay que reemplazarla por PER03
  (cumplida parcialmente, con el detalle de la tabla de arriba) y dejar
  anotado que DUE05 se completó el 2026-10-19.
- Resumen de estados (Historias v4 y Backlog v3): el conteo sigue en 34
  terminadas y 1 parcial, pero la parcial pasa a ser PER03 en lugar de
  DUE05 (DUE05 entra como terminada y PER03 sale de las terminadas).

## 2026-11-04 — Sprint 4: verificación contra el código

Al armar la entrega del Sprint 4 se verificó cada historia contra el
código, no contra el estado que dicen los documentos. Las ocho que los
PDFs dan por Terminadas existen y funcionan, pero cuatro tienen
diferencias con el enunciado; IA02 es la más importante.

| Historia | Diferencia con el enunciado |
|---|---|
| REC01 | Solo quedan registrados los avisos hechos con sesión o reclamados por REC09. Un reencuentro se acredita a una sola persona por caso (el último aviso con sesión), no a todas las que ayudaron. |
| REC02 | No hay notificación: el rescatista ve el agradecimiento solo si entra a `/mi-historial`. Llega a una sola persona por caso. |
| REC09 | Vincula solo el aviso recién enviado, en el mismo navegador y dentro de 1 hora, no "los avisos que envié". Con un email ya registrado, Supabase no devuelve error (por la confirmación de email), así que la pantalla decía "Tu ayuda quedó registrada. Revisá tu email…" y el aviso quedaba pendiente; se vincula al iniciar sesión (probado de punta a punta el 2026-11-04). La rama "already registered" del commit `7c78044` (que guarda `avisoPendienteId` en `localStorage`) no se ejecuta con esta configuración. **Mensaje corregido el 2026-11-04** (`FichaPublica.jsx`): para un email ya registrado (`identities` vacío) ahora dice "Tu ayuda quedó registrada. Si ya tenías una cuenta con ese email, iniciá sesión y tu aviso se va a vincular solo."; una cuenta nueva sigue viendo "Revisá tu email si hace falta confirmar la cuenta", porque a ella sí le llega el email. El alcance sigue siendo un único aviso. |
| ADM02 | `/admin/placas` es un listado sin totales ni filtros. El estado "Dada de baja" no se puede alcanzar: nada en la app pone una placa en `baja` (DUE08, pendiente). "Perdida" incluye la sospecha automática. |
| IA01 | Las sugerencias solo se aplican al crear una mascota; al editar la función se llama solo para verificar la foto, sin aplicar sugerencias (probado el 2026-11-04: los campos editados a mano quedaron intactos). Al aplicar la sugerencia pisa lo que el usuario ya hubiera escrito (no probado ese día). |
| IA02 | La versión desplegada el 2026-09-21 dejaba subir una foto sin animal (solo advertía). **Corregido el 2026-11-04** (ver "IA02 — estado"). La verificación sigue corriendo solo en el navegador y solo para la foto de perfil. |
| DAT02, DAT03 | Registran los datos (inicio, cierre y `caso_id`); el análisis de recuperación y de contribución de avisos es DAT05, pendiente. Probado de punta a punta el 2026-11-04: `iniciado_en` y `cerrado_en` quedan bien, y los 3 avisos de un caso (incluido uno anónimo vinculado después) tienen el `caso_id` correcto. Que un aviso sin caso abierto quede con `caso_id` nulo es una deducción **no probada** (en la base, los 12 avisos existentes tienen caso). |
| IA03 | No se construyó nada (confirmado en `src/` y `supabase/`). Sigue en el Sprint 5. |

**Limitación de esta verificación:** el 2026-11-04 el proyecto de
Supabase estaba pausado por inactividad, así que no se pudieron leer
`historial_colaboracion()`, `reclamar_avistamiento()` ni
`registrar_avistamiento()`. Lo que dependa de ellas se dedujo de cómo
las llama el frontend y de `CLAUDE.md`.

**IA02 — estado:** pasa a **Parcial**. El 2026-11-04, una vez
reactivado el proyecto de Supabase (la primera publicación había
fallado con el proyecto en `INACTIVE`), se desplegó la corrección:
`sugerir-ficha` (versión 4) distingue la categoría `sin_animal`
(persona, objeto, paisaje) de `incorrecta` (hay un animal, pero la foto
es borrosa u oscura), y `AltaMascota.jsx` bloquea y descarta la foto sin
animal, igual que las inapropiadas; la verificación corre ahora también
al editar la ficha, mientras que las sugerencias de IA01 siguen
aplicándose solo al crear (commit `85bee1a`). Probada contra la función
real con tres imágenes: la foto de Blanca da `apta`, un dibujo sin
animal da `sin_animal` y la foto de un animal muy pixelada da
`incorrecta` (solo advertencia). IA02 queda Parcial porque la
verificación corre solo en el navegador y solo cubre la foto de perfil
de la mascota, no la del reencuentro. El conteo pasa a 33 terminadas y 2 parciales (IA02 y PER03).

**IA02 — ajuste del mismo día (versión 7 de `sugerir-ficha`).** Para no
depender de que el modelo acepte analizar fotos de personas, el prompt
pide solo clasificar el contenido (sin identificar ni describir
personas) y la respuesta es una llamada obligatoria a una herramienta
(salida estructurada), no texto libre que haya que interpretar. Se
probó contra la función real: fotos públicas de Messi (reducida y
original de 5 MB), Obama, Einstein y Taylor Swift dan `sin_animal`; la
foto de Blanca da `apta`; un dibujo sin animal da `sin_animal`; un
animal muy pixelado da `incorrecta`. La normalización de la sugerencia
acepta ahora tildes y mayúsculas ("pequeño" → `pequeno`). En
`AltaMascota.jsx` el bloqueo ocurre solo si el modelo contestó
`sin_animal` o `inapropiada`; cualquier error técnico deja pasar la
foto sin verificar. Probado en el formulario real en Chrome: Messi →
bloquea con el mensaje "Esta foto no parece ser de un animal…" y
descarta el archivo; Blanca → completa los campos; fallo de red
forzado con la foto de Messi → no bloquea. **Límite conocido:** una
imagen que la API no acepta (por ejemplo formato HEIC) se trata como
error técnico y pasa sin verificar.

**IA02 — endurecimiento de la subida (2026-11-04, tarde).** Una prueba
real desde un iPhone con la foto de un pizarrón no fue bloqueada. La
función clasifica bien un pizarrón (`sin_animal`), así que se corrigieron
los huecos del lado del formulario (`AltaMascota.jsx`): (1) el botón
Guardar queda deshabilitado ("Verificando la foto…") mientras la IA
analiza, porque antes se podía guardar una foto que después resultaba
bloqueada; (2) la foto se reduce a 1280 px y se convierte a JPEG en el
navegador antes de mandarla (la API no acepta HEIC y rechaza imágenes
muy pesadas); (3) si la verificación falla por cualquier motivo, se
muestra el aviso gris "No pudimos verificar la foto en este momento.
Podés seguir igual." en vez de fallar en silencio; (4) una respuesta
vieja del análisis ya no pisa a una foto elegida después. Probado en el
formulario real: pizarrón (PNG) y la foto original de 5 MB de Messi se
bloquean; Blanca completa los campos; un archivo corrupto y un fallo de
red muestran el aviso gris y dejan pasar. **Límite que sigue vigente:**
la verificación es solo del navegador; quien suba una foto saltándose la
app (directo a Storage) no pasa por ella. Cerrarlo del todo requiere
subir la foto a través de la Edge Function.

**Limpieza de Storage (2026-11-04).** La foto se verifica antes de
subirse: al elegirla viaja a `sugerir-ficha` como imagen en base64 y
solo se sube al bucket `fotos-mascotas` al guardar, con el guardado
bloqueado si fue rechazada; por eso una foto rechazada nunca llega al
bucket. Se borraron del bucket la foto del pizarrón de las pruebas
(3 MB, había quedado asignada a la mascota inactiva "Jejeje" antes del
bloqueo) y cuatro archivos de pruebas de septiembre (tres `gorda.png`
de 26 MB, una sin mascota y dos de las mascotas inactivas "1111123" y
"blanca", y un `foto_reencuentro_test.png` de 0 KB). A las tres
mascotas inactivas se les dejó vacío `foto_url`. El bucket pasó de
78,49 MB (10 archivos) a 1,01 MB (6 archivos).

### Pendiente — fugas de Storage menores, sin resolver

- Si falla el guardado de la mascota después de subir la foto, el
  archivo queda sin dueño en el bucket.
- Al editar la mascota y cambiar la foto, la anterior no se borra del
  bucket.

Ninguna de las dos pierde datos ni afecta a un usuario: es solo basura
que se acumula en Storage con el tiempo. Quedan para el Sprint 5.

## 2026-11-04 — Limpieza de datos de prueba: excepción a las bajas lógicas

Por decisión explícita del dueño del proyecto se dejaron en producción
solo dos mascotas, Blanca y la Doggie activa. Se borraron de la base 16
mascotas de prueba (más 4 `VerifS4…` y 1 `VerifIA03…` creadas por las
pruebas de punta a punta del mismo día), con sus 4 escaneos, 2 avisos y
4 casos (las `VerifS4…`: 12 escaneos, 6 avisos y 4 casos). Las placas
**no** se borraron, por ser inventario real de códigos QR: las de esas
mascotas volvieron a `sin_asignar`, y las 22 que figuraban `activa` sin
mascota también (ahora hay 2 `activa` y 45 `sin_asignar`). Se borró la
cuenta "Rescatista de prueba" de Authentication (queda solo la del
administrador) y los archivos de Storage que quedaron sin uso (el bucket
pasó de 78,49 MB a 0,34 MB, con 2 archivos). Es una excepción puntual a
la regla de que los casos, avisos y escaneos no se eliminan, justificada
por tratarse de datos de prueba; no es un criterio para datos reales.
Quedan 5 escaneos de septiembre sin mascota (de placas cuyas mascotas se
habían borrado en limpiezas anteriores), que no se tocaron.

## 2026-11-04 — IA03: texto de búsqueda para compartir (construida)

**IA03** ("que al reportar la pérdida se genere automáticamente un texto
de búsqueda con los datos de la ficha y la última ubicación, listo para
compartir por WhatsApp o redes") pasa de Pendiente a **Terminada**.

- **Dónde:** `src/lib/textoBusqueda.js` (`armarTextoBusqueda`,
  `enlaceWhatsApp`) y el componente `TextoParaCompartir` de
  `src/pages/Panel.jsx`. `Panel.jsx` ahora también lee `ultima_lat` y
  `ultima_lng` del caso.
- **Qué hace:** mientras la mascota tiene un caso en estado `perdida`,
  el panel muestra un bloque "Texto para compartir", **plegado por
  defecto** (título, "Ver texto" y los botones; el texto completo y su
  explicación aparecen al tocar "Ver texto", que pasa a "Ocultar texto"),
  con dos botones con ícono: "Compartir" y "Copiar". "Compartir" abre el
  panel de compartir del teléfono (`navigator.share`), donde la persona
  elige WhatsApp, Instagram, etc.; si el navegador no lo tiene (una
  compu) o falla, abre el enlace `wa.me` con el texto ya cargado en
  pestaña nueva; si la persona cierra el panel, no hace nada más.
  "Copiar" usa el portapapeles (con respaldo para navegadores viejos) y
  muestra "Copiado" 2 segundos. Ambos funcionan igual con el bloque
  cerrado o abierto. El
  texto lleva nombre, especie y sexo ("una perra"), tamaño, raza, color,
  señas, la última ubicación conocida como enlace a Google Maps y un
  enlace a la ficha pública para avisar sin registrarse.
- **Es una plantilla, no una consulta a la IA.** Sale al instante, no
  depende de ningún servicio y no manda datos de la mascota a ningún
  lado. Si más adelante se quiere un texto redactado por el modelo, se
  puede reemplazar `armarTextoBusqueda` sin tocar el resto.
- **Nunca bloquea:** si falta la raza, el color, las señas, la ubicación
  o la placa, simplemente se omite esa línea.
- **Se actualiza solo:** se arma en cada render con los datos actuales de
  la ficha y del caso (probado: cambiar color y señas en la edición se
  refleja al volver al panel).
- **Privacidad (mismas reglas que la ficha pública):** no incluye el
  teléfono del dueño; no incluye el mensaje que dejó al reportar la
  pérdida (PER07); omite las señas si el dueño las marcó "no se
  muestran" (DUE05); redondea la ubicación a ≈110 m ("zona
  aproximada"). No menciona dinero ni recompensas.
- **Sin emojis, a propósito.** La primera versión llevaba 🐾 y 🙏. Al
  probar el enlace de WhatsApp se vio que la página `api.whatsapp.com`
  muestra cualquier emoji como "�" (probado con cinco emojis, en
  escritorio y con agente de iPhone). Sin emojis, el texto llega
  completo y correcto.
- **Probado:** con Blanca en el panel real (se pasó su caso abierto de
  "posible pérdida" a "perdida" y después se restauró tal cual estaba):
  el texto se generó bien, el enlace de WhatsApp lleva exactamente ese
  texto y abre la página de "Share on WhatsApp" con el texto correcto, y
  "Copiar" deja el texto en el portapapeles. Los botones con ícono y el
  bloque plegable se probaron en el panel real, simulando solo la
  respuesta del caso abierto (sin escribir en la base): arranca cerrado,
  se abre y se cierra, y "Compartir" y "Copiar" entregan el mismo texto
  con el bloque cerrado y abierto; también los casos de panel cancelado,
  panel que falla y navegador sin panel. Con una mascota
  descartable (borrada después): cambio de color y señas, señas "no se
  muestran" y ficha casi vacía, todos arman el texto sin errores.
- **Límites conocidos:** (1) solo aparece con el caso en `perdida`, no
  en `posible_perdida`; (2) el texto no es editable por el dueño;
  (3) "última ubicación" es la que quedó guardada en el caso (la que el
  dueño marcó al reportar, o la de la detección automática si confirmó una
  sospecha), no la del aviso más reciente de alguien que la vio; (4) no
  se probó la apertura en la app de WhatsApp de un teléfono real, solo la
  página `api.whatsapp.com/send` a la que redirige `wa.me`; (5) el panel
  nativo de compartir (`navigator.share`) se probó con un simulacro en el
  navegador de escritorio, no en un teléfono real.
- **Conteo del backlog:** 34 terminadas, 2 parciales (IA02 y PER03), 10
  pendientes y 17 descartadas, sobre las 63. Los PDFs de Historias v4 y
  Product Backlog v3 todavía dan IA03 por Pendiente (hay que corregirlos
  en su fuente, junto con PER03, DUE05 e IA02).

## 2026-11-04 — Vista previa del enlace de la ficha (Open Graph)

Trabajo sin historia asociada del backlog (mejora de IA03 y del
compartir). Al pegar `https://…/m/CODIGO` en WhatsApp, Instagram,
Facebook o Telegram, esas apps piden la página con un rastreador que no
ejecuta JavaScript, así que de la ficha (una SPA de React) solo veían el
HTML genérico: título "Huella Blanca", sin foto. Ahora ven una tarjeta con
la foto de la mascota, un título y una descripción.

- **Cómo:** `vercel.json` desvía `/m/:codigo` a `/api/og?codigo=…` **solo**
  cuando el user-agent es un rastreador de vista previa (WhatsApp,
  facebookexternalhit, Facebot, meta-externalagent, Twitterbot,
  TelegramBot, Slackbot, LinkedInBot, Discordbot, Pinterest, Skype,
  Applebot, reddit, Embedly, vkShare, Viber). Cualquier otro visitante
  recibe la SPA de siempre. La regla general de la SPA ahora excluye
  `/api/`. Archivos: `api/og.js` (función de Vercel), `api/_meta.js`
  (armado de las etiquetas, testeable) y `eslint.config.js` (reglas de
  Node para `api/`).
- **Qué devuelve:** `og:title` "Se perdió {nombre}" si hay caso `perdida`,
  "Posible pérdida: {nombre}" si es `posible_perdida` y el nombre solo si
  no hay caso; `og:description` "Perra mestiza, negra con pecho blanco." y,
  con caso abierto, "Si ves a {nombre}, avisá desde acá, sin
  registrarte."; `og:image` la foto pública de la mascota (o el ícono de la
  app si no tiene); `og:url`; tarjeta grande de Twitter si hay foto.
  Código inexistente, placa sin activar o consulta fallida: vista previa
  general, sin inventar nada.
- **Privacidad:** solo se usa lo que `ficha_publica()` devuelve y que ya es
  público (nombre, especie, sexo, raza, color, foto, estado del caso).
  **Nunca** se incluyen señas, salud, teléfono, mensaje del dueño,
  ubicación ni domicilio, así que respeta por construcción las reglas de
  visibilidad de DUE05. Los textos se escapan contra HTML inyectado y se
  recortan (título 90, descripción 200 caracteres). La página lleva
  `noindex`.
- **No cuenta escaneos:** la función solo lee con `ficha_publica()`; no
  llama a `registrar_escaneo()`, así que un rastreador no abre una
  sospecha de pérdida ni suma al historial (comprobado: los escaneos de
  Blanca y Doggie no cambiaron).
- **Probado:** (1) pruebas de la lógica: 5 estados, datos faltantes, nombre
  y raza con código malicioso, textos larguísimos, y que no se filtre
  ningún dato privado; (2) la lista de rastreadores acierta con 13
  user-agents reales de rastreadores y no desvía a 6 de personas (Chrome,
  Safari, Android, Firefox y los navegadores internos de Instagram y
  Facebook); (3) en producción, las personas siguen recibiendo la SPA en 7
  rutas con dos navegadores, y los archivos estáticos se siguen sirviendo;
  (4) en producción, 8 rastreadores (WhatsApp Android e iOS, Facebook,
  Instagram/Meta, Telegram, X, Slack, iMessage) reciben la tarjeta de
  Blanca ("Se perdió Blanca") y la de Doggie ("Posible pérdida: Doggie");
  la imagen responde 200, `image/jpeg`, 117 KB; la página responde en
  ~0,2 s.
- **No se pudo probar con el depurador de Facebook** (developers.facebook
  .com/tools/debug): exige iniciar sesión en Facebook y su API pública no
  respondió. Se emuló pidiendo la página con el user-agent
  `facebookexternalhit/1.1`. Falta pasar el enlace por el depurador a mano.
- **Límites conocidos:** (1) la foto de Blanca es **vertical** (638 × 1165
  px) y las tarjetas son horizontales o cuadradas: las apps la recortan
  por el centro y la cabeza podría quedar cortada; no se verificó en las
  apps reales. La solución de fondo sería generar al subir la foto una
  versión apaisada (1200 × 630) centrada en la cara. (2) Un rastreador que
  no esté en la lista recibe la SPA, o sea la vista previa genérica: se
  agrega su user-agent a `vercel.json`. (3) Las apps guardan la vista
  previa en caché (WhatsApp y Facebook, días): un cambio de foto o de
  estado puede tardar en verse; agregar `?v=2` al enlace fuerza una
  lectura nueva. En el borde de Vercel la caché es de 60 segundos.

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

## 2026-11-04 — Botón de accesibilidad (mejora transversal, sin historia)

No corresponde a ninguna de las 63 historias: es una mejora transversal,
igual que la configuración de la PWA y el lector de QR. Ya había una
primera pasada de accesibilidad en `c6994bf` (idioma, `aria-label` en los
campos, diálogo modal); esto agrega el botón con preferencias.

- **Qué es:** un botón flotante (abajo a la izquierda, en **todas** las
  pantallas, incluida la ficha pública) que abre un panel con:
  tamaño del texto (normal / grande ×1,2 / muy grande ×1,4), alto
  contraste, reducir animaciones y subrayar enlaces y botones, más un
  "Restablecer".
- **Dónde:** `src/components/BotonAccesibilidad.jsx`,
  `src/lib/accesibilidad.js` y el final de `src/index.css`. Se monta una
  sola vez en `App.jsx`; `main.jsx` aplica las preferencias antes de
  dibujar para que no haya parpadeo.
- **Cómo funciona:** las preferencias se guardan en `localStorage` (sin
  cuenta: quien encuentra una mascota puede usarlas igual) y se aplican
  como atributos `data-*` en `<html>`. El tamaño del texto escala todos los
  `font-size` con una variable CSS (`--escala-texto`) y no con `zoom`,
  porque `zoom` desajusta los clics sobre los mapas de Leaflet.
- **Respeta el sistema:** sin elección previa, el alto contraste parte de
  `prefers-contrast: more` y reducir animaciones de
  `prefers-reduced-motion: reduce` (esta última además se aplica siempre
  por CSS). Lo que la persona elige en el panel pisa al sistema.
- **Teclado y lectores de pantalla:** el panel es un `dialog` con nombre,
  el botón informa `aria-expanded`, los tamaños usan `aria-pressed` y las
  opciones son `switch`; Escape cierra y devuelve el foco al botón. Cada
  control mide al menos 44 px de alto.
- **Se puede mover:** el botón se arrastra con el dedo o el mouse (un
  movimiento corto sigue siendo un toque) y la posición se guarda en
  `localStorage` como fracción de la pantalla, así sigue en un lugar
  razonable si se gira el teléfono. Como arrastrar no lo puede hacer toda
  la gente, el panel tiene además cuatro botones de esquina como
  alternativa. El panel se acomoda junto al botón y siempre queda dentro
  de la pantalla (al probarlo apareció un defecto: con el botón hacia el
  medio, el panel se salía por el borde; corregido). Por defecto, abajo a
  la derecha, donde llega el pulgar.
- **Sin librerías nuevas:** solo el ícono de `lucide-react`, que ya estaba.
- **Probado** en Chrome con celular simulado, en la ficha pública y en el
  panel del dueño (con la respuesta del caso simulada, sin escribir en la
  base): cada opción cambia el atributo y la apariencia; "muy grande" no
  produce desborde horizontal; las preferencias sobreviven a recargar y
  pasan de la ficha al login; "animaciones reducidas" apaga el pulso de la
  alerta roja; Escape y "Restablecer" funcionan.
- **Límites:** (1) no se probó con VoiceOver/TalkBack ni en un teléfono
  real; (2) el alto contraste cubre las clases conocidas de la app, no es
  un tema completo: lo nuevo que se agregue hay que revisarlo; (3) no
  cambia el tamaño de los mapas ni de las fotos.
- **Revisión de lo básico (misma fecha).** Se revisaron la ficha pública y
  el panel. Estaba bien: todas las `<img>` con `alt`, todos los campos con
  nombre accesible, idioma `es-AR`, zoom no bloqueado y ningún elemento
  clicable que no fuera botón o enlace. Se corrigieron dos cosas:
  (1) **contraste**: "Ver un ejemplo de ficha" (2,74:1 → 4,85:1), el texto
  de las miniaturas vacías (2,93:1 → 5,49:1) y las etiquetas de los chips
  de la ficha (4,31:1 → 5,49:1); (2) **errores sin anunciar**: los 16
  mensajes de error (`<p className="ayuda error">`) llevan ahora
  `role="alert"`, así un lector de pantalla los avisa (probado con una
  contraseña incorrecta en el login). **Quedan sin hacer**, para el
  Sprint 5: etiquetas visibles en los campos (hoy la etiqueta es solo el
  placeholder y los `select` no tienen), marcar el punto del mapa con
  teclado (se puede avisar escribiendo una referencia, TRA11), rol y foco
  en las ventanas modales del panel, y toques de menos de 44 px
  (por ejemplo "Ver texto").

## 2026-11-04 — Ícono de casa para el domicilio en los mapas

Mejora de interfaz, sin historia asociada. Al marcar el domicilio en el alta
de la mascota (`AltaMascota.jsx`, que también sirve para editar), el punto
ya no es el alfiler azul de Leaflet sino una casa blanca dentro de un
círculo azul (`iconoCasa` en `src/lib/leaflet-iconos.js`, un `divIcon` con
SVG propio, sin librerías ni imágenes nuevas). El mapa de avistamientos
(`MapaAvistamientos.jsx`) usa el mismo ícono para el domicilio, así se
distingue de los alfileres de quienes avisaron. El punto exacto es el centro
del círculo. No cambia lo que se guarda ni la privacidad: el domicilio sigue
siendo solo una coordenada que nunca se muestra en la ficha pública.
Probado en el formulario real y en el mapa de Blanca (sin guardar nada).

## 2026-11-04 — Avisos numerados en el mapa de avistamientos

Mejora de interfaz, sin historia asociada. Con varios avisos, los alfileres
iguales marean. En `MapaAvistamientos.jsx` cada aviso con ubicación es ahora
un círculo numerado (`iconoAviso` en `src/lib/leaflet-iconos.js`): el número
sigue el orden cronológico (1 = el primer aviso), así se lee el recorrido
de la mascota. El más reciente con ubicación va en **rojo y más grande**; los
demás, en gris azulado. La lista de abajo usa los mismos números y colores,
y el popup dice "Aviso N" (más "el más reciente"). El domicilio sigue siendo
la casa en círculo azul. El número, y no solo el color, identifica cada aviso.
Sin librerías nuevas. Probado en el mapa de Blanca (solo lectura).

**Ajuste automático de la vista (mismo día):** el mapa arrancaba centrado en
el domicilio con el zoom de siempre, y un aviso lejano quedaba fuera de la
vista (en la prueba solo se veía el 1 de los 3). Ahora, con al menos un aviso
con ubicación, el mapa se ajusta solo para mostrar el domicilio y todos los
avisos a la vez (`fitBounds`, sin librerías; zoom máximo 16 para no acercarse
de más a un solo punto). Solo se reajusta cuando cambian los puntos, no
mientras la persona mueve el mapa.

**Límite conocido:** dos avisos casi en el mismo lugar se superponen y uno
tapa al otro (en la prueba, el 2 queda detrás del 1; se ve en la lista). Agrupar
avisos cercanos en un solo círculo con un número requiere una librería nueva
(por ejemplo `react-leaflet-cluster`), no incorporada.

## 2026-11-11 — Panel de administración: cuentas

Función nueva, sin historia asociada (queda fuera de los sprints). Pantalla
`/admin/cuentas` (`AdminCuentas.jsx`), solo lectura: lista todas las cuentas
con nombre, email, teléfono, alta y mascotas activas, con buscador; el detalle
de cada una muestra último ingreso, avisos dados y, por mascota, placa,
escaneos, avisos, caso abierto y domicilio. Se apoya en dos funciones nuevas
(`admin_listar_cuentas()` y `admin_detalle_cuenta()`, migración
`20261111000000_admin_cuentas.sql`) que verifican `rol = 'admin'` dentro de la
base, igual que `generar_lote_placas()`; solo `authenticated` puede ejecutarlas.

**Excepción a la regla "el domicilio jamás se expone".** Por decisión del dueño
del proyecto, el administrador ve la coordenada del domicilio (con un enlace a
OpenStreetMap) y el teléfono de cada cuenta, para verificar que los domicilios
sean reales. El alcance de la excepción es solo el rol `admin`, verificado en
la base y no solo en la pantalla. La ficha pública no cambia: sigue sirviéndose
únicamente por `ficha_publica()`, sin domicilio.

Fuera de esta primera versión: estadísticas con Recharts (DAT05) y acciones de
administración (desactivar cuentas o mascotas, cambiar roles).

### 2026-11-11 — Eliminar cuentas, papelera y borrado a los 30 días

Se agregó a `/admin/cuentas` "Eliminar cuenta" y una pestaña **Papelera**.
Migraciones `20261111000001_admin_baja_cuentas.sql` y
`20261111000002_papelera_cuentas.sql`.

- **Eliminar** (`admin_eliminar_cuenta()`): baja lógica. Marca el perfil
  (`activa = false`, `eliminada_en = now()`), desactiva sus mascotas, descarta
  sus casos abiertos y bloquea el ingreso en Auth (`banned_until`). No se puede
  eliminar la cuenta propia ni la de otro admin (lo rechaza la base, no solo la
  pantalla). **Restaurar** (`admin_restaurar_cuenta()`) reactiva solo la cuenta;
  las mascotas se reactivan aparte.
- **Excepción a la regla de bajas lógicas.** A los 30 días en la papelera la
  cuenta se borra **por completo**, por decisión del dueño del proyecto: si se
  elimina es porque la persona lo pidió o incumplió las normas, y no debe
  quedar ningún dato. Lo hace la Edge Function `purgar-cuentas`, que corre una
  vez por día con `pg_cron` (`supabase/purgar-cuentas-cron.sql`) y exige un
  secreto compartido (`CRON_SECRET`). Orden: fotos de Storage (desde SQL no se
  pueden borrar), datos de la base (`purgar_cuenta()`, solo para cuentas que ya
  están en la papelera) y por último el usuario de Auth. Si un paso falla, se
  corta y la cuenta se reintenta al día siguiente.
- **Qué se borra:** la cuenta, sus mascotas, los casos, escaneos y avisos de
  esas mascotas y todas sus fotos. Los avisos que la persona dio sobre mascotas
  de **otros** dueños quedan (son parte del caso de ese dueño) pero sin
  `reportado_por`, contacto ni foto. Las placas de sus mascotas no se borran:
  se desvinculan y quedan de baja, para que un collar viejo no abra la ficha de
  otra mascota.
- **Sin probar todavía:** la Edge Function no está desplegada ni se ejecutó el
  borrado contra datos reales. El orden de borrado se escribió sin poder ver
  las claves foráneas de la base; si una referencia desconocida lo rechaza, el
  error vuelve en la respuesta de la función y la cuenta queda en la papelera
  sin perder nada.

## 2026-11-11 — Modo oscuro y botón de accesibilidad fijo

Mejora transversal, sin historia. En el panel de accesibilidad se **reemplazó**
la opción de mover el botón (arrastre y cuatro esquinas) por un interruptor de
**Modo oscuro**. El botón queda fijo abajo a la derecha y el ícono pasó de la
figura humana (que remitía al símbolo de discapacidad, y el panel es de ajustes
visuales para cualquiera) a "Aa".

- **Cómo funciona:** preferencia `oscuro` en `localStorage`; sin elección previa
  parte de `prefers-color-scheme: dark`. Se aplica con `data-tema="oscuro"` en
  `<html>` y un bloque de reglas en `index.css` (sin librerías). El **alto
  contraste manda** sobre el modo oscuro y no se combinan (con contraste alto,
  `data-tema` queda en `claro`).
- **Contraste:** los 27 pares de texto y fondo del tema superan 4,5:1,
  calculados con la fórmula de luminancia relativa de WCAG.
- **Mapas:** solo los mosaicos de OpenStreetMap se oscurecen, con un filtro CSS
  (`invert` + `hue-rotate`) sobre `.leaflet-tile-pane`; marcadores, círculo y
  popups no se tocan. Es una aproximación de colores. El QR queda sobre blanco
  para poder leerse.
- **Probado** con Chrome (celular simulado) en inicio, login y el panel abierto,
  y con una página de prueba para el mapa. **No se vio** con sesión iniciada:
  ficha pública, panel del dueño, mapa de avistamientos y pantallas de
  administración (pedían login o escriben en la base).

## 2026-11-16 — Eliminar cuentas: borrado inmediato (reemplaza la papelera)

Se simplifica lo del 2026-11-11 ("Eliminar cuentas, papelera y borrado a los 30
días"): **eso queda sin efecto**. Eliminar una cuenta desde `/admin/cuentas` la
borra **al instante y para siempre**, con una confirmación en pantalla. Se
quitaron la papelera, "Restaurar", el bloqueo de ingreso, el cron y la Edge
Function programada `purgar-cuentas`; por decisión del dueño del proyecto, que
consideró excesivo el diseño anterior. Sigue siendo una excepción a la regla de
bajas lógicas (ver sección 2 de CLAUDE.md).

- **Cómo funciona:** la pantalla llama a la Edge Function `eliminar-cuenta`
  (`supabase/functions/eliminar-cuenta`), que verifica con la sesión de quien
  llama que sea administrador (no alcanza con la pantalla), rechaza la cuenta
  propia y las de otros administradores, y borra en este orden: fotos de Storage
  (desde SQL no se pueden borrar), datos de la base (`purgar_cuenta()`, solo
  `service_role`) y el usuario de Auth. Si un paso falla se corta y la pantalla
  avisa.
- **Qué se borra:** la cuenta, sus mascotas, los casos, escaneos y avisos de esas
  mascotas y todas sus fotos. Los avisos que la persona dio sobre mascotas de
  **otros** dueños quedan (son parte del caso de ese dueño) pero sin
  `reportado_por`, contacto ni foto. Las placas de sus mascotas no se borran: se
  desvinculan y quedan de baja, para que un collar viejo no abra la ficha de otra.
- **Migración** `20261111000003_borrado_inmediato_de_cuentas.sql`: quita el cron,
  desbloquea a los usuarios bloqueados, elimina `admin_eliminar_cuenta()` y
  `admin_restaurar_cuenta()`, quita `perfiles.activa` y `perfiles.eliminada_en` y
  deja `purgar_cuenta()` sin la exigencia de papelera.
- **Qué se probó y qué se encontró.** Se probó el borrado de punta a punta contra
  producción con dos cuentas de prueba creadas y borradas para ese fin (A, la que
  se borra, y B, de control), con mascotas, placa, escaneos, casos, avisos y 4
  fotos. Pasaron: el borrado de datos y de fotos de Storage, la desvinculación de
  la placa, la anonimización del aviso de A sobre la mascota de B, que B y sus
  datos quedaran intactos, y que un usuario común no puede eliminar cuentas. La
  prueba reveló un defecto real del diseño de la papelera: el bloqueo usaba
  `banned_until = 'infinity'`, que el servidor de Auth no sabe leer, y el usuario
  de Auth no se podía borrar (`Database error loading user`), con lo que habría
  quedado huérfano. Sin papelera ni bloqueo, el defecto desaparece.
- **Prueba de la función nueva (2026-11-16), 25 de 28 verificaciones en verde**,
  con una sesión real de un administrador de prueba (creado y borrado para ese
  fin, igual que las cuentas A, B y D): lista y detalle de cuentas para el admin y
  rechazo para un usuario común (400); `eliminar-cuenta` rechaza a un usuario
  común (403), la cuenta propia, a otro admin, un id inexistente (404) y un id
  inválido (400), sin tocar nada; y al eliminar a A borra el usuario de Auth, el
  perfil, la mascota, los casos, escaneos y avisos de A, deja la placa de baja,
  anonimiza el aviso que A dejó sobre la mascota de B y no toca a B. Las 3
  verificaciones restantes eran las fotos de A, que seguían respondiendo `200`
  en su URL pública: **no es un fallo del borrado sino el caché del CDN de
  Supabase.** Se comprobó aparte: el archivo desaparece de `storage.objects` al
  instante y la URL pública responde `200` unos 30-60 s y después `400`. La
  base volvió exactamente a su estado anterior (`usuarios_auth` incluido).

## 2026-11-16 — DAT05: estadísticas del administrador (Recharts)

Primera versión del módulo de analítica, en `/admin/estadisticas` (solo
`rol = 'admin'`; el resto es rebotado al panel).

- **Base:** función `admin_estadisticas()` (migración
  `20261116000000_admin_estadisticas.sql`). Verifica el rol dentro de la
  función y devuelve solo conteos agregados: nunca coordenadas ni datos
  personales. Solo `authenticated`, revocada a `anon`. Los días se cuentan en
  hora de Buenos Aires.
- **Pantalla:** 8 tarjetas de totales (cuentas, mascotas activas, placas
  activas y sin asignar, escaneos, avisos, casos abiertos, reencuentros), dos
  gráficos de área (escaneos y avisos por día, últimos 30) y uno de barras
  (casos por estado). Cada gráfico tiene "Ver como tabla". Color de serie
  único, tomado de la paleta validada del skill de visualización, con valores
  propios para modo oscuro.
- **Dependencia nueva:** `recharts`.
- **Prueba (10 de 10):** usuario común rebotado y función rechazada (400
  `no_autorizado`); el admin ve tarjetas y tres gráficos SVG; los totales
  coinciden con la base; sin scroll horizontal en 390 px; modo oscuro; tablas
  desplegables. Base restaurada tras la prueba.
- **Alcance:** DAT05 queda como primera versión. Pendiente de decidir si se
  agregan más métricas (altas de cuentas por semana, distancia de los escaneos).

## 2026-11-16 — PER04 y PER03 (resto): notificaciones push al dueño

Primer canal para avisarle algo al dueño sin que esté mirando el panel.
Se eligió **Web Push** sobre email: encaja con la decisión de que la app
instalable es para el dueño "que recibe los avisos", no exige cuenta en
terceros ni dominio propio (los proveedores de email gratuitos —Resend,
Brevo— exigen verificar un remitente, y `huella-blanca.vercel.app` no se
puede verificar), y es inmediato. Limitación conocida: en iPhone solo
funciona con la app agregada a la pantalla de inicio (iOS 16.4+); la
tarjeta del panel lo explica en ese caso.

**Base** (`20261116000001_notificaciones_push.sql`):
- `suscripciones_push`: una fila por dispositivo del dueño (endpoint,
  claves `p256dh`/`auth`), con RLS para que cada uno maneje solo las suyas.
- `notificaciones`: historial y cola a la vez (`titulo`, `cuerpo`, `url`,
  `tipo`, `enviada_en`, `resultado`). Nunca se borran (bajas lógicas). El
  dueño puede leer las suyas; nadie las inserta desde el navegador.
- `mascotas.horas_confirmacion` (1 a 168, por defecto 24): plazo para
  responder a una posible pérdida antes de que pase sola a `perdida`.
- Triggers que arman el aviso: `escaneos` (posible pérdida nueva, o escaneo
  con caso abierto, con la distancia a la casa en texto legible —
  `distancia_legible()`), `avistamientos` (siempre: situación y distancia;
  si el aviso abrió el caso, lo dice en el mismo mensaje en vez de mandar
  dos). Un escaneo cerca de casa sin caso **no** avisa: sería ruido en cada
  paseo.
- `enviar_notificacion_push()`: trigger sobre `notificaciones` que llama con
  `pg_net` a la Edge Function `notificar`. El secreto compartido se lee de
  **Vault** (`notificar_secret`), nunca está en el SQL versionado.
- `escalar_casos_sin_respuesta()` + trabajo de **pg_cron** cada 15 minutos
  (PER03 b): posible pérdida sin respuesta en más de `horas_confirmacion`
  horas → `perdida` + aviso `perdida_automatica`. La UI para elegir el
  plazo está en el formulario de mascota (6/12/24/48 h).

**Edge Function `notificar`** (desplegada sin verificación de JWT; se
autentica con la cabecera `x-notificar-secret`): firma con VAPID
(`jsr:@negrel/webpush`), envía a cada suscripción del dueño, borra las que
el servicio de push da por muertas (404/410), guarda el resultado por
notificación (`enviadas`, `fallidas`, `dadas_de_baja`, `errores`). Secretos:
`VAPID_CLAVES` (JWK pública+privada) y `NOTIFICAR_SECRET`. La clave pública
VAPID está en `src/lib/push.js` (no es secreta).

**Frontend**: `public/sw-push.js` se suma al service worker generado por
vite-plugin-pwa con `importScripts` (manejo de `push` y `notificationclick`,
que abre la `url` del aviso); `src/lib/push.js` (activar/desactivar);
`src/components/AvisosPush.jsx`, tarjeta en el panel con un solo botón.
No bloquea nada: el panel funciona igual sin activar los avisos.

**Pruebas** (datos de prueba creados y borrados; base restaurada):
- Circuito en la base y la función, 25 de 26 (la restante es el cron,
  pausado a propósito, ver abajo): escaneo cerca sin caso no avisa; escaneo
  lejos abre posible pérdida y avisa con "2,4 km de tu casa"; escaneo con
  caso abierto avisa; avistamiento con y sin ubicación; una suscripción con
  endpoint muerto se da de baja sola; el escalado pasa el caso a `perdida`
  una sola vez y avisa; `anon` no lee ni encola nada; la función rechaza sin
  secreto o con una sesión común (401).
- **Push real, 15 de 15, con Chrome (headless) y `npm run preview`**:
  login, tarjeta visible, "Activar avisos" → suscripción real en FCM
  guardada en la base → escaneo lejos → la función envía (`enviadas: 1`) →
  **la notificación se mostró en el service worker** con el título, el texto
  y la url esperados → "Desactivar" borra la suscripción en la base y en el
  navegador. Ojo al probar: registrarse en FCM tarda más de 10 s en
  headless; el botón muestra "Un momento…" mientras tanto.
- **Incidente durante la prueba:** la primera corrida llamó a
  `escalar_casos_sin_respuesta()` y, como corre sobre toda la base, pasó a
  `perdida` el caso real de Blanca (posible pérdida automática abierta
  desde el 11/11, más vieja que las 24 h). Se revirtió en el acto (caso de
  vuelta a `posible_perdida`, notificación borrada, 4 escaneos huérfanos de
  la mascota de prueba eliminados) y el script ahora omite ese paso si hay
  casos reales elegibles. El cron quedó pausado (`cron.unschedule`) hasta
  decidir qué hacer con ese caso viejo. **Resuelto el 2026-11-17:** al ir a
  descartarlo, el caso ya estaba en `perdida`, confirmado por el dueño desde
  el panel durante su prueba del push (dos escaneos de Blanca esa madrugada,
  el segundo con el aviso entregado). No se tocó: es su decisión. Cron
  reactivado con `cron.schedule('escalar-casos-sin-respuesta', '*/15 * * * *',
  ...)`; en ese momento no había ningún caso elegible para escalar.
- Bug encontrado y corregido antes de commitear: `Panel.jsx` solo guardaba
  `perfilId` en la rama del perfil diferido, así que la tarjeta no aparecía
  para ningún dueño con perfil ya creado.
- Commits `5fa9530` (todo lo anterior) y `5ff2664` (en iPhone sin instalar,
  mostrar cómo activar los avisos en vez de nada: el componente devolvía
  null antes de llegar a ese aviso porque Safari no tiene `PushManager`).
- **Probado en el teléfono del dueño del proyecto el 2026-11-17: la
  notificación llegó.** Queda sin probar en la otra plataforma.

## 2026-11-17 — Fugas menores de Storage (punto 6 del plan de Sprint 5)

Sin historia asociada. Dos fugas en el bucket `fotos-mascotas`:
a) si el guardado de la mascota (o el cierre del caso con foto de
reencuentro) fallaba después de subir la foto, la foto quedaba huérfana;
b) al editar una mascota y reemplazar la foto, la anterior no se borraba.

- **Bloqueo previo:** el bucket no tenía política de borrado, así que el
  navegador no podía limpiar ni siquiera una foto propia. Migración
  `20261117000000_storage_borrado_propio.sql`: política `DELETE` para
  `authenticated` dentro de su propia carpeta (`<uid>/...`), la misma regla
  que la de subida y actualización. Aplicada.
- `src/lib/fotos.js` (nuevo): `subirFoto`, `borrarFoto` (nunca lanza: si no
  puede borrar queda la huérfana, pero no se interrumpe a la persona) y
  `rutaDesdeUrl`. `AltaMascota.jsx`: si el insert o el update falla, borra
  la foto recién subida; si el update anduvo y había foto anterior, la
  borra. `MapaAvistamientos.jsx`: si el cierre del caso falla, borra la
  foto del reencuentro recién subida.
- **Prueba, 21 de 21, con Chrome real contra el servidor de desarrollo y
  una foto real (pasa por la verificación de IA):** reemplazar la foto al
  editar borra la anterior y deja solo la nueva; editar sin foto nueva no
  toca nada; un guardado que falla después de subir (forzado con un plazo
  de confirmación fuera del `check` de la base) borra la foto subida y la
  mascota conserva la anterior, tanto al editar como al crear; crear con
  foto sigue funcionando; otro usuario y `anon` no pueden borrar fotos
  ajenas (Storage responde 200 con lista vacía: no borra nada). Base y
  Storage restaurados.
- No probado por pantalla: el rollback de la foto de reencuentro (mismo
  código que el de la mascota; no hay forma de forzar el fallo del cierre
  desde la pantalla sin tocar la base).

## 2026-11-17 — IA02 completa: verificación de fotos del lado del servidor

Cierra los dos huecos documentados el 2026-11-04: la verificación corría solo
en el navegador (se evitaba subiendo directo a Storage) y no cubría la foto de
reencuentro (REC02).

**Diseño.** El navegador ya no sube nada directo al bucket: se quitaron las
políticas de subida y actualización (migración
`20261117000001_fotos_solo_por_funcion.sql`; quedan lectura pública y borrado
de la carpeta propia). Las fotos entran únicamente por la Edge Function nueva
**`subir-foto`**, que exige sesión, valida que los bytes sean un JPEG de hasta
6 MB, verifica con la IA y guarda en la carpeta de la cuenta con la clave de
servicio. Para no pagar ni esperar dos veces la clasificación:
- `sugerir-ficha` (v8), al elegir la foto, devuelve además un **pase**:
  HMAC (clave: la service_role key, que no sale del servidor) sobre
  `{uid, sha256 de los bytes, categoría, vencimiento 2 h}`, solo si hubo
  sesión y la foto no fue rechazada.
- `subir-foto` acepta el pase solo si coincide la cuenta y el hash de los
  bytes que recibe; si no hay pase o no coincide, clasifica ella misma. Solo
  rechaza (422 `foto_rechazada`) cuando la IA contestó `sin_animal` o
  `inapropiada`; si la IA no responde, guarda igual (`categoria:
  'sin_verificar'`): la app sigue funcionando sin IA, como manda el proyecto.
- La clasificación (prompt, herramienta, normalización) se movió a
  `supabase/functions/_shared/clasificar.ts`; el pase, a `_shared/pase.ts`.
- El navegador manda a `subir-foto` **los mismos bytes** que mandó a
  `sugerir-ficha` (el JPEG reducido a 1280 px que ya se generaba para la IA):
  `src/lib/fotos.js` concentra `fotoAJpegBase64`, `verificarFoto`,
  `subirFoto`, `borrarFoto`. Lo guardado es ese JPEG reducido, no el archivo
  original (más liviano para la ficha pública).
- `MapaAvistamientos.jsx`: la foto del reencuentro pasa por la misma
  verificación al elegirla (bloquea `sin_animal`/`inapropiada`, advierte
  `incorrecta`, deja pasar si la IA no responde) y se guarda por `subir-foto`.

**Prueba, 37 de 37 (dos corridas; Chrome real + API; con fotos reales que
pasan por la IA; base y Storage restaurados):** todo lo del punto 6 sigue
andando (reemplazo, rollback, alta); la subida directa a Storage con sesión y
la sobrescritura de una foto propia se rechazan; `subir-foto` sin sesión da
401, con bytes que no son JPEG 400, con una imagen sin animal (un cartel de
texto generado en el navegador) 422 y no guarda nada; `sugerir-ficha` da pase
con el perro y no con el cartel, ni sin sesión; el pase del perro no sirve
para subir el cartel (se reclasifica y rechaza); con el pase correcto sube en
<2 s sin reclasificar; el pase de A no vale para B; y el cierre de caso con
foto de reencuentro por pantalla la guarda vía `subir-foto`. En la primera
corrida, la llamada sin sesión dio 503 por arranque en frío de la función
(verificado aparte: 401 estable) y la limpieza dejó dos fotos huérfanas de
las cuentas de prueba, borradas después y con el script corregido.

**Costo:** una llamada a Haiku por foto elegida (igual que antes); una
segunda solo si el pase falta o no coincide.

## 2026-11-17 — Sistema de botones y navegación (revisión de diseño)

Pedido del dueño del proyecto: los botones se veían desparejos y no se
entendía para qué servía cada uno. Se revisaron las pantallas con capturas
reales (claro y oscuro, 390 px) y se contrastaron con las guías de Material 3
y de Apple y con apps de uso masivo. Hallazgos:
- Sin jerarquía: cinco botones del mismo peso por mascota; el más visible era
  **Eliminar** (ancho completo, rojo), la acción más rara y más peligrosa.
- Alturas desparejas: el botón crecía con el texto ("Marcar como perdida" en
  dos líneas estiraba al de al lado); `.boton-accion` medía 34 px, por debajo
  del mínimo táctil de 44 px (Apple) / 48 dp (Material).
- Tres vocabularios conviviendo (`.boton` radio 12 / texto 16, `.boton-accion`
  radio 8 / texto 13, enlaces grises sueltos como navegación).
- Navegación como botones gigantes al pie ("Volver al panel", "Volver a mis
  mascotas") y "Cerrar sesión" con el mismo peso que "Cargar mascota".
- Sin íconos: nada se entendía sin leer.
- **Bug:** el botón flotante de accesibilidad tapaba "La vi acá" en la ficha
  pública, el botón más importante de la app.

Cambios (`src/index.css`, `Encabezado.jsx`, `Panel.jsx` y las pantallas que
tenían "volver" al pie):
- **Tres niveles de énfasis**, como Material 3: `.boton` primario (relleno,
  uno por pantalla), `.boton.secundario` tonal (fondo suave, sin borde) y
  `.boton.terciario` solo texto (cancelar, cerrar sesión, salir). Altura fija
  de 48 px, tipografía 600, foco visible uniforme.
- **Acciones de tarjeta** (`.boton-accion`): grilla de 2 columnas, 44 px
  mínimo, tonales, con ícono (lucide). Orden por importancia: primero lo que
  cambia el estado ("Se perdió" / "Sí, se perdió" en ámbar, "Está conmigo"),
  después consulta ("Avisos", "Editar", "Código QR"), y al final "Eliminar
  mascota" como texto rojo, a lo ancho, sin competir. Los dos botones de una
  fila miden siempre lo mismo (`height: 100%`; los `<button>` no se estiran
  solos en grid, medido en el DOM antes de corregir).
- **Volver en la cabecera** (`<Encabezado volver="/panel" />`): círculo tonal
  con chevron a la izquierda del logo. Se quitaron los botones "Volver…" del
  pie de Avistamientos, Código QR y Perfil.
- **Lista de navegación** en el panel (`.lista-enlaces`): filas con flecha
  ("Tu perfil", "Tu colaboración", administración) en vez de enlaces grises.
  "Cerrar sesión" pasa a terciario con ícono.
- Diálogos: "Cancelar" como terciario, la acción como primario/peligro.
- **Botón de accesibilidad arriba a la derecha**, donde no tapa ninguna acción
  principal; el panel se abre debajo.
- Modo oscuro y alto contraste actualizados para todas las variantes.

Verificado con capturas en claro y oscuro de inicio, login, panel (con una
mascota en posible pérdida y otra normal), diálogo de eliminar, edición, mapa,
QR y ficha pública; y con las pruebas de interfaz existentes (cuentas de
administración y estadísticas), que siguen pasando.

## 2026-11-17 — IA03 rediseñada: hoja "Compartir la búsqueda" con afiche

Pedido del dueño del proyecto: el bloque "Texto para compartir" del panel no
era útil ni cómodo (un `<pre>` plegable con dos botones, metido en la tarjeta
de la mascota). Se reemplazó por lo que la gente realmente reenvía cuando se
pierde una mascota: **una imagen** (afiche) para WhatsApp, estados e
Instagram, más un mensaje editable con el enlace de la ficha.

- **Entrada:** con la mascota en `perdida`, la tarjeta del panel muestra la
  etiqueta "Perdida, en búsqueda" junto a sus datos y, como acción destacada,
  "Compartir búsqueda" (ámbar, megáfono). La pantalla de avisos
  (`MapaAvistamientos.jsx`) tiene el mismo botón, como primario, arriba de
  "volvió a casa" (que pasa a secundario mientras dure la búsqueda).
- **Hoja** (`src/components/CompartirBusqueda.jsx`, hoja inferior con cierre
  por X, Escape o tocando afuera):
  - **Afiche** (`src/lib/afiche.js`): PNG 1080×1350 (4:5, el formato que
    WhatsApp e Instagram muestran completo) dibujado en un canvas del
    navegador: banda roja "SE PERDIÓ", foto (recorte centrado; si no carga,
    recuadro con la huella), nombre, descripción (especie/sexo, raza, tamaño,
    color), señas si son públicas (DUE05), QR de la placa, enlace de la ficha
    con "avisá sin registrarte" y "Perdida desde el …". Sin teléfono, sin
    domicilio, sin el mensaje privado del dueño. La foto de Storage se carga
    con `crossOrigin='anonymous'` (el bucket responde
    `Access-Control-Allow-Origin: *`), así el canvas no queda "contaminado" y
    se puede exportar. "Compartir afiche" usa `navigator.share` con el
    archivo y el texto como pie; donde no hay panel de compartir (compu), lo
    descarga.
  - **Mensaje:** el texto de `textoBusqueda.js` (sin cambios) en una vista
    previa que, al tocarla, se vuelve un `textarea` editable, con
    "Restablecer". La plantilla propone, la persona corrige. Botones
    "Compartir texto" (o "Abrir en WhatsApp" sin `navigator.share`) y
    "Copiar texto".
- Se eliminaron `TextoParaCompartir` y sus estilos (`.texto-busqueda*`).
  `Panel.jsx` y `MapaAvistamientos.jsx` ahora traen `iniciado_en` del caso
  (para la fecha del afiche) y el mapa trae también las placas (para el QR).
- **Verificado** con Chrome real: la hoja abre desde el panel, el afiche se
  genera (1080×1350) con la foto real de una mascota cargada desde Storage,
  se guardó el PNG a disco y se revisó a ojo en claro y oscuro (una primera
  versión recortaba la foto desde arriba y dejaba al animal afuera, y la
  fecha se pisaba con la firma: corregido). La vista previa pasa a edición y
  la hoja se cierra. Sin probar en teléfono: el panel nativo de compartir con
  archivo (`navigator.share` con `files`), que headless no tiene.

## 2026-11-17 — Seguridad: cualquier cuenta podía hacerse administradora

Hallazgo de la revisión completa del proyecto (Sprints 1 a 5), hecha
leyendo el código y la base reales. Era el problema más grave encontrado.

- **Qué pasaba.** Las políticas de `perfiles` solo verificaban
  `auth.uid() = id`, sin restringir la columna `rol`. Cualquier cuenta común
  podía crear su perfil con `rol = 'admin'` llamando a la API REST con su
  propia sesión (en vez de pasar por `Registro.jsx`), o cambiárselo después
  con un `update`. Todas las funciones de administración verifican el rol
  *dentro* de la base (`admin_listar_cuentas`, `admin_detalle_cuenta`,
  `generar_lote_placas`, `admin_estadisticas`, la Edge Function
  `eliminar-cuenta`), y esa decisión era correcta, pero verificaban un dato
  que el propio usuario podía escribir. Se comprobó en vivo con una cuenta
  temporal: el insert con `rol = 'admin'` devolvió 201 y a partir de ahí la
  cuenta listó todas las cuentas con teléfono y email, y generó placas. La
  cuenta y la placa de la prueba se borraron enseguida.
- **Corrección** (migración `20261117000002_perfiles_rol_protegido.sql`), con
  dos defensas independientes:
  1. Privilegios de columna: se revocó `insert`/`update` sobre la tabla a
     `anon` y `authenticated`, y se otorgó solo sobre `id, nombre, telefono`
     (insert) y `nombre, telefono` (update). Desde la API, `rol` no se puede
     ni nombrar: el intento devuelve 403.
  2. Trigger `proteger_rol_perfil` (`before insert or update`): si hay sesión
     de un usuario que no es admin, fuerza `rol = 'usuario'` al insertar y
     conserva el rol anterior al actualizar. Cubre el caso de que alguien
     vuelva a otorgar el privilegio por error. Sin sesión (SQL Editor,
     service role) no interviene: los administradores se nombran desde ahí.
  También: `rol` con default `'usuario'`; se borró la política de insert
  duplicada (`dueños crean su propio perfil`, idéntica a `perfil propio:
  crear`); la política de update ahora tiene también `with check`.
- **Frontend**: `Registro.jsx`, `Panel.jsx` (perfil diferido) y
  `FichaPublica.jsx` (cuenta después de avisar, TRA09) ya no mandan `rol`.
  El frontend publicado antes de este cambio sí lo mandaba, y la base ahora
  lo rechaza: por eso el cambio de base y el de frontend se publicaron juntos.
- **Verificado** con el mismo script que mostró el agujero: insert con
  `rol = 'admin'` → 403; insert legítimo sin rol → 201 con `rol = 'usuario'`;
  edición de nombre y teléfono (lo que hace `/perfil`) → 200; update de
  `rol` → 403; `admin_listar_cuentas` y `generar_lote_placas` →
  `no_autorizado`. El trigger solo, simulando una sesión de usuario común
  dentro de una transacción deshecha: el `update ... set rol = 'admin'`
  queda en `usuario`. La base quedó como estaba (2 perfiles, 2 usuarios,
  49 placas; 1 admin y 1 usuario).
- Los demás hallazgos de la revisión (lector `/escanear`, `sugerir-ficha` sin
  sesión, teléfono sin normalizar, mensaje de pérdida que no se muestra,
  aviso sin ubicación, entre otros) quedan pendientes; se corrigen de a uno.

## 2026-11-17 — Seguridad: lector `/escanear` y gasto de IA sin sesión

Otros dos hallazgos de la revisión completa del proyecto.

**1. `/escanear` navegaba a cualquier cosa que dijera el QR.**
- **Qué pasaba.** `Escanear.jsx` hacía `window.location.href = texto` con
  cualquier URL que no fuera de la propia app. Un QR con `javascript:...` o
  `data:text/html,...` ejecutaba código dentro de la app o mandaba a la
  persona a cualquier sitio sin que lo viera.
- **Corrección.** La decisión pasó a `src/lib/codigoQR.js`
  (`interpretarCodigo`): un link de la propia app se sigue con el router;
  un link `http(s)` de otro sitio se muestra en pantalla con "Abrir de todos
  modos" (la persona decide) y "Escanear otro código"; cualquier otro
  esquema se rechaza ("Este código no es el de una placa de Huella Blanca").
- **Verificado** con la función contra nueve entradas (link propio,
  `javascript:` en mayúsculas y minúsculas, `data:`, `file:`, `intent:`,
  `vbscript:`, texto suelto y un `https` ajeno): solo el propio navega y
  solo el `https` ajeno pide confirmación. La pantalla compila y pasa el
  lint, pero no se probó con la cámara (headless no tiene cámara): queda
  probarla en el teléfono con un QR propio y uno ajeno.

**2. `sugerir-ficha` llamaba a Claude sin sesión.**
- **Qué pasaba.** La función clasificaba antes de mirar si había sesión;
  con la clave anon (pública, viaja en el JS) cualquiera podía llamarla en
  bucle y gastar la cuenta de la API.
- **Corrección.** Sesión obligatoria antes de llamar a la API (los dos usos
  reales, alta/edición de mascota y foto de reencuentro, siempre la
  tienen). Tabla nueva `uso_ia` (migración `20261117000003_uso_ia.sql`, RLS
  sin políticas) y `_shared/limite.ts`: 30 clasificaciones por cuenta y por
  hora, sumando `sugerir-ficha` y `subir-foto`. Pasado el límite,
  `sugerir-ficha` responde 429 (la app sigue sin verificar, como ante
  cualquier fallo de la IA) y `subir-foto` **sin pase** responde 429 con
  "Subiste muchas fotos en poco tiempo...": guardar sin verificar sería la
  forma de saltear IA02. Con un pase válido no se llama a la IA y no cuenta.
  Si el contador falla, deja pasar.
- **Bug encontrado al probarlo, no documentado antes:** responder 401 sin
  leer el cuerpo de la petición (la foto, cientos de KB) dejaba colgada la
  siguiente petición al runtime de Supabase (401, después 503 o sin
  respuesta). `subir-foto` ya tenía el mismo patrón desde su creación. Las
  dos funciones ahora leen el cuerpo antes de responder; ocho llamadas
  seguidas sin sesión dan 401 en menos de 2 s cada una.
- **Verificado:** prueba nueva de 8 casos (sin sesión → 401; con sesión →
  apta + pase y una fila en `uso_ia`; el navegador no puede leer ni
  escribir `uso_ia` → 403; con el cupo lleno, cargado directo en la tabla
  para no gastar 30 llamadas reales: `sugerir-ficha` → 429, `subir-foto` sin
  pase → 429, `subir-foto` con pase → se guarda; los rechazos no suman
  filas) y la prueba completa de IA02 de punta a punta en Chrome, 37/37
  (actualizada: el caso "sin sesión clasifica pero no da pase" ahora espera
  401). La base y Storage quedaron como estaban.

## 2026-11-17 — TRA05: el botón de contacto llamaba a un número inexistente

Hallazgo de la revisión completa del proyecto; bug funcional no
documentado hasta ahora.

- **Qué pasaba.** `/registro` y `/perfil` guardaban el teléfono como texto
  libre, y `ficha_publica()` arma los botones con `'tel:+' || dígitos` y
  `'https://wa.me/' || dígitos`. Un dueño que escribe su celular como se usa
  en Argentina ("297 412 3456", "0297 15 4123456") terminaba con
  `tel:+2974123456`: un número de otro país. **Le pasaba a la cuenta real
  del dueño del proyecto**, con Blanca en `perdida`: el botón de llamar y el
  de WhatsApp de su ficha pública no funcionaban. La cuenta de prueba tenía
  `+54` sin el `9`, que WhatsApp necesita para celulares argentinos. La
  prueba en vivo del 2026-09-19 no lo detectó porque usó un número cargado a
  mano por SQL en formato internacional.
- **Corrección.**
  - `src/lib/telefono.js` (`normalizarTelefono`): asume Argentina salvo que
    empiece con `+`/`00` y otro código de país; saca el `0` del código de
    área y el `15` (si se puede saber dónde está sin adivinar), agrega
    `+54 9` y exige 10 dígitos. Sin código de área, o sin forma de saberlo,
    no guarda: lo dice. Se asume celular (siempre el `9`): el contacto es
    para llamar o escribir por WhatsApp al dueño. Limitación aceptada: un
    teléfono fijo argentino quedaría mal; el campo pide "Celular".
  - `src/components/CampoTelefono.jsx`, usado en `Registro.jsx` y
    `Perfil.jsx`: mientras se escribe muestra "Se va a guardar como
    +54 9 2974123456" o qué le falta; el error en rojo aparece recién al
    intentar guardar. Sigue siendo opcional.
  - `Panel.jsx` (perfil diferido): normaliza el teléfono que quedó en
    `user_metadata` desde el registro; si no se puede, crea el perfil sin
    teléfono (el panel ya invita a cargarlo) en vez de fallar.
  - Base: los dos teléfonos existentes se convirtieron (copia de los valores
    anteriores guardada fuera del repositorio) y el check
    `perfiles_telefono_e164` (migración
    `20261117000004_telefono_e164.sql`) rechaza cualquier otro formato que
    llegue por la API.
- **Verificado.** 26 casos de la función (con y sin `+54`, `9`, `0`, `15`,
  `00`, Buenos Aires, Córdoba, códigos de área de 4 dígitos, otros países,
  números incompletos o imposibles). Con Chrome real y cuentas temporales,
  16/16: `/perfil` guarda en E.164 y muestra el número legible; sin código
  de área no guarda y explica; otro país se respeta; vacío lo borra; la API
  directa con un número sin formato da 400 por el check; `/registro` con
  número inválido no crea la cuenta; perfil diferido con "0297 15 ..." queda
  normalizado y con un número imposible queda sin teléfono. La ficha pública
  de Blanca devuelve ahora `tel:+549…` y `wa.me/549…`. La base quedó como
  estaba. Falta tocar el botón desde un teléfono real.

## 2026-11-17 — PER07, TRA11 y TRA09: tres huecos de la ficha pública

Hallazgos de la revisión completa del proyecto, corregidos juntos porque
tocan la misma pantalla y las mismas funciones.

**PER07: el mensaje del dueño no se mostraba.** El formulario de "Se perdió"
pide un mensaje para quien la encuentre, se guarda en
`casos_perdida.mensaje` y `ficha_publica()` lo devuelve como
`mensaje_perdida`, pero `FichaPublica.jsx` no lo usaba en ningún lado: el
dueño escribía algo que nadie iba a leer. La entrada del 2026-09-19 dice que
se "reemplazó por un subtítulo", pero el campo siguió en el formulario. Se
muestra ahora dentro de la alerta, como "Mensaje de su familia", tal cual lo
escribió (saltos de línea respetados; React lo trata como texto, no como
HTML). Sigue siendo privado por construcción: solo sale con un caso abierto.

**TRA11: no se podía avisar sin marcar el mapa.** La historia pide marcar el
lugar a mano *o escribir una referencia*; la pantalla exigía el punto. Ahora,
sin punto, el campo de texto pasa a "¿Dónde la viste? Calle, esquina, algo
que haya cerca…" y alcanza con eso; sin punto ni texto, explica qué falta.
Al revisar la función apareció un bug que esto habría destapado:
`registrar_avistamiento()` hacía siempre `update casos_perdida set
ultima_lat = p_lat`, así que un aviso sin coordenadas **borraba la última
ubicación del caso** (la zona que muestra la ficha pública). Corregido en la
migración `20261117000005_aviso_sin_ubicacion_y_reclamo.sql`: solo actualiza
con coordenadas, y sin coordenadas exige el texto (la base aplica la misma
regla que la pantalla).

**TRA09/REC09: el reclamo del aviso se perdía en silencio.**
`reclamar_avistamiento()` solo aceptaba avisos de menos de 1 hora, pero el
proyecto exige confirmar el email antes de dar sesión; `Panel.jsx` borraba el
id de `localStorage` sin mirar el resultado. Quien confirmaba al día
siguiente perdía el reconocimiento y nadie se enteraba. Ahora la ventana es
de 7 días (el id es un UUID que solo conoce el navegador que mandó el aviso),
la función devuelve el nombre de la mascota y el panel confirma "Tu aviso
sobre {nombre} quedó registrado en tu cuenta", con enlace a "Mi historial".
Si falla la conexión, el id queda para el próximo ingreso. El reclamo
inmediato de `FichaPublica.jsx` (cuenta con sesión al instante) también mira
el resultado. Se revocó la ejecución a `anon` (la documentación ya decía
"solo `authenticated`").

**Verificado** con una mascota y placa temporales (nada tocó a Blanca ni
mandó avisos al dueño real), 21/21: por API, sin punto ni texto →
`falta_lugar`; sin punto con texto → guardado como `manual` sin coordenadas y
**sin borrar** la última ubicación; con punto → la actualiza; reclamo sin
sesión → 401; de hace 8 días → `no_reclamable`. En Chrome con la ubicación
denegada: la ficha muestra el mensaje de la familia con su salto de línea y
sin interpretar HTML; el formulario ofrece mapa o texto, sin nada explica
qué falta, con texto se envía. En el panel, un aviso de hace 2 días se
asocia a la cuenta, se confirma con el nombre de la mascota y no se puede
reclamar dos veces. La base quedó como estaba.

## 2026-11-17 — PER04: límite de frecuencia de los push al dueño

Hallazgo de la revisión completa del proyecto.

- **Qué pasaba.** `registrar_escaneo()` y `registrar_avistamiento()` son
  públicas (quien encuentra la mascota no se registra; es una decisión de
  diseño que no cambia) y el código de la placa está impreso en el collar y
  en cada afiche compartido. Antes de PER04 eso era, como mucho, ruido en una
  tabla; desde que existen los push, cualquiera podía con un script mandarle
  al dueño decenas de notificaciones por minuto. Además, con un caso abierto
  cada escaneo era un push.
- **Criterio.** Los datos nunca se pierden: cada notificación queda en el
  historial y cada aviso en el mapa. Lo que se frena es el push.
- **Corrección** (migraciones `20261117000006_limite_notificaciones.sql` y
  `20261117000007_notificacion_prioritaria.sql`):
  - Trigger `before insert` en `notificaciones` (`limitar_notificacion_push`):
    marca `resultado = {"omitida": "limite_frecuencia"}` si es un "escanearon
    la placa" y ya salió otro en 10 minutos para esa mascota, si ya salieron
    5 push en 10 minutos o 12 en una hora. El trigger que llama a la Edge
    Function `notificar` ignora las omitidas.
  - "¿Está perdida?" y "pasó a perdida" no se frenan nunca: las genera el
    sistema, una vez por caso.
  - El siguiente push que sí sale agrega "Además: N avisos y M escaneos más.
    Mirá el mapa." y lleva al mapa, para que el dueño sepa que hay novedades.
  - **"Está conmigo" es prioritaria** (columna `notificaciones.prioritaria`):
    no la frena el tope de 10 minutos, sí el de la hora. Salió de la prueba:
    con la primera versión, un "Está conmigo" que llegó después de cuatro
    "La vi pasar" quedó omitido, y es el aviso más importante de todos.
  - Tope duro en `registrar_avistamiento()`: 20 avisos por hora por mascota
    (`demasiados_avisos`); la ficha le dice a la persona que use el botón de
    contacto, que con caso abierto está visible. Un uso real queda lejos.
- **Verificado** con una mascota temporal, 13/13: tres escaneos seguidos →
  sale uno y se omiten dos; el aviso siguiente sale con "Además: 2 escaneos
  más"; el quinto "La vi pasar" en 10 minutos se omite y el "Está conmigo"
  siguiente sale igual; pasada la ventana vuelve a salir; tope de 12 por
  hora; aviso 21 en la hora → `demasiados_avisos`; "¿está perdida?" sale con
  el tope lleno; la Edge Function procesó las enviadas y ninguna omitida. La
  prueba de notificaciones del 2026-11-16 (26 casos) se actualizó en dos
  pasos que chocaban con cambios de hoy (aviso sin ubicación ahora necesita
  texto; segundo escaneo a segundos del primero ahora se omite) y pasa 26/26.
  La base quedó como estaba; Blanca no recibió notificaciones.
- **Límite conocido:** el tope es por mascota, no por quien llama (las
  funciones son anónimas a propósito). Alguien que mande 20 avisos falsos en
  una hora bloquea los avisos de esa mascota hasta que pase la hora; el botón
  de contacto sigue funcionando. Se eligió esto antes que exigir cuenta para
  avisar, que contradice la decisión central del proyecto.

## 2026-11-17 — Ficha de ejemplo, escaneos del dueño y "el dueño confirmó"

Hallazgos de la revisión completa del proyecto.

**1. "Ver un ejemplo de ficha" llevaba a la ficha real de Blanca.** El enlace
del inicio apuntaba a `/m/C30A45A9`. Con Blanca en `perdida`, cada visitante
que solo quería conocer la app registraba un escaneo real (188 de los 198
escaneos de la base son de Blanca), recibía el teléfono del dueño dentro del
JSON y veía los botones para llamarlo, y si tocaba "La vi acá" le mandaba un
aviso real con push. Ahora el enlace lleva a `/ejemplo`: la misma pantalla
(`FichaPublica` con `demo`) con datos fijos de `src/lib/fichaEjemplo.js` (los
datos públicos de Blanca, con un caso simulado y la "última ubicación" en el
centro de Caleta Olivia, no en su casa). No hace ningún pedido a la base, no
tiene teléfono (los botones explican qué harían), el aviso es simulado y un
recuadro aclara que es un ejemplo. `/m/C30A45A9` sigue siendo la ficha real.

**2. Los escaneos del propio dueño contaban como escaneos reales.**
`registrar_escaneo()` registraba el escaneo y, lejos de casa, abría una
posible pérdida aunque quien escaneaba fuera el dueño (probando su placa,
compartiendo la ficha, de viaje). Ahora, si hay sesión y es el dueño, devuelve
`{"ok": true, "propio": true}` sin registrar nada. Los escaneos viejos no se
tocan (no se puede saber cuáles fueron del dueño).

**3. PER03 b: "El dueño confirmó" cuando nadie confirmó.** Si un caso pasaba
solo a `perdida` por falta de respuesta, la ficha decía "El dueño confirmó que
no está en su casa". Se agregó `casos_perdida.escalado_en`, que pone
`escalar_casos_sin_respuesta()`; `ficha_publica()` lo informa como
`perdida_automatica` y la ficha dice "La detectamos lejos de su casa y su
familia todavía no respondió". El texto confirmado pasó a "Su familia
confirmó...". Los tres casos abiertos al aplicarlo (Blanca, Luneri, Liliana)
los confirmó su dueño: ninguno tiene notificación de paso automático, así que
no hubo que completar datos.

Migración `20261117000008_escalado_y_escaneo_propio.sql`.

**Verificado**, 19/19 con una mascota temporal: el dueño escanea lejos → no se
registra nada; otra persona → escaneo, posible pérdida y aviso; la tarea de
escalado (corrida solo después de comprobar que no había casos reales en
condiciones de escalar) marca el caso y la ficha muestra el texto nuevo;
Blanca sigue como confirmada; `/ejemplo` muestra el aviso de ejemplo, la
alerta y el mensaje, los botones de contacto no tienen enlace real, el aviso
simulado no ofrece crear cuenta, y **no hubo ningún pedido a la base** en todo
el recorrido (medido con las peticiones de red de Chrome); el dueño con sesión
abre su propia ficha y no suma escaneo. Blanca sin escaneos, avisos ni
notificaciones nuevas.

**Batería completa de pruebas de la sesión**, corrida después de este cambio:
teléfono 26/26 y 16/16, escalada de rol 6/6, límite de IA 8/8, ficha y avisos
21/21, límite de push 13/13, ejemplo y escalado 19/19, notificaciones 26/26,
IA02 37/37, fotos 21/21, estadísticas 12/12, panel 13/13, push en Chrome real
15/15. Notas:
- `prueba_fotos` se cortó la primera vez por un error de red de la API de
  Supabase y dejó dos cuentas de prueba (`prueba-fotos-…@example.com`), que se
  borraron; repetida, pasó entera.
- `prueba_escalada` usaba un teléfono `'123'`, que el check E.164 de hoy
  rechaza a propósito; se cambió por uno válido.
- `prueba_eliminar.py`: 25/28. Las 3 restantes son las URLs públicas de las
  fotos borradas, que el CDN sigue sirviendo un rato desde su caché (la misma
  causa documentada el 2026-11-16); el objeto ya no existe en Storage.
- `prueba_purga.py` quedó obsoleta: prueba la papelera con purga diaria que se
  retiró el 2026-11-16.
La base quedó igual que al empezar (2 cuentas, 4 mascotas, 49 placas, 198
escaneos, 5 avisos, 11 casos, 3 fotos).

## 2026-11-17 — Pruebas automatizadas en el repositorio

Hallazgo de la revisión completa del proyecto: no había ninguna prueba
versionada. Todo lo que este documento cita como probado ("25 de 28", "37 de
37", etc.) eran scripts en una carpeta temporal, fuera del repositorio:
nadie más podía repetirlos y se perdían al cerrar la sesión.

- **`tests/unit/`** (`npm test`): 18 pruebas de lógica pura con el runner que
  trae Node (`node:test`, sin dependencias nuevas), en menos de un segundo:
  normalización del teléfono a E.164 (TRA05), el lector `/escanear` que
  rechaza `javascript:`/`data:` y el texto para compartir la búsqueda (IA03:
  sin teléfono, domicilio ni mensaje privado; señas solo públicas; ubicación
  redondeada; sin emojis).
- **`tests/e2e/`** (`PRUEBAS_EN_PRODUCCION=si npm run test:e2e`): los 13
  scripts de punta a punta usados durante las sesiones del 2026-11-16 y
  2026-11-17, llevados al repositorio con un módulo común (`comun.mjs`:
  claves pedidas al CLI en cada ejecución, base, API, Chrome, verificaciones
  y código de salida). Corren contra la base de producción (no hay un
  proyecto de pruebas aparte), por eso no arrancan sin esa variable.
  `correr.mjs` levanta el servidor de desarrollo y el build de producción si
  hacen falta, corre las pruebas de a una, compara la base con la línea base
  y resume; `limpiar.mjs` borra restos de pruebas cortadas (cuentas
  `prueba-…@example.com` y placas con código de prueba), el problema que hubo
  hoy cuando un error de red cortó `prueba_fotos` a mitad de camino.
- Cambios al llevarlas: `seguridad-rol` pasó de imprimir resultados a
  verificarlos (y suma el trigger de respaldo); `limite-ia` suma la regresión
  del 401 que colgaba las llamadas siguientes; `eliminar-cuenta.py` comprueba
  el borrado de fotos en la tabla de Storage y no en la URL pública (el caché
  del CDN la seguía sirviendo: eran las 3 verificaciones "en rojo" del
  2026-11-16, que ahora pasan); las pruebas de IA bajan la foto pública de
  una mascota cargada en vez de guardar una foto en el repositorio, que es
  público. `prueba_purga.py` no se llevó: probaba la papelera retirada el
  2026-11-16.
- **Resultado** de la primera corrida desde el repositorio: 13 de 13 pruebas
  en verde, 240 de 240 verificaciones, la base igual que al empezar. Unitarias:
  18 de 18.
- Limitaciones: las de punta a punta dependen de macOS con Google Chrome (o
  `CHROME_PATH`), del CLI de Supabase con sesión y de `python3`; tardan unos
  20 minutos. No hay integración continua: se corren a mano.

## 2026-11-17 — Esquema de la base versionado en el repositorio

Hallazgo de la revisión completa del proyecto: la base no se podía
reconstruir desde el repositorio. Las migraciones empiezan el 2026-10-19; las
seis tablas originales, sus políticas RLS y el índice único de casos abiertos
se crearon a mano en el editor SQL y no estaban escritos en ningún archivo.

- **`supabase/esquema/esquema.sql`**: foto completa del esquema actual (9
  tablas, 42 restricciones, 10 índices, 22 funciones, 5 triggers, 22
  políticas de `public` y `storage.objects`, permisos por tabla, columna y
  función, el bucket `fotos-mascotas` y la tarea de `pg_cron`). Sin datos y
  sin valores secretos: de Vault, solo el nombre `notificar_secret`.
- **`supabase/esquema/exportar.mjs`** (`npm run esquema:exportar`): lo genera
  leyendo el catálogo de Postgres con `supabase db query --linked`, porque
  `supabase db dump` necesita Docker, que el proyecto no usa. Es determinista
  (dos corridas dan el mismo archivo) y aborta si lo exportado contiene algo
  que parezca un secreto. No va en `migrations/` para que la CLI no lo aplique
  como un cambio.
- **Verificado**: se ejecutó completo en un PostgreSQL 17.4 vacío (PGlite, en
  una carpeta temporal, sin instalar nada en el sistema) con las piezas de
  Supabase simuladas; se crearon todos los objetos, con RLS en las 9 tablas, y
  un recorrido de humo pasó 15/15 (alta de dueño, mascota y placa; ficha
  pública sin domicilio ni teléfono; escaneo lejos de casa que abre la posible
  pérdida y, por los triggers, encola la notificación; contacto solo con caso
  abierto; check del teléfono E.164; `rol` no escribible por
  `authenticated`). Esa prueba de reconstrucción no quedó en el repositorio
  porque necesita PGlite como dependencia de desarrollo, a decidir por el
  dueño del proyecto.
- El archivo muestra tal cual algunas cosas ya señaladas en la revisión y
  todavía sin corregir: funciones de administración ejecutables por `anon`
  (las protege el chequeo de rol interno), políticas duplicadas en `placas` y
  `casos_perdida`, y `mascotas` con política `all` para el dueño (permite un
  `delete` físico).
