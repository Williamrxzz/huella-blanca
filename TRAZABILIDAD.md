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
