# Huella Blanca — Contexto completo del proyecto

Trabajá siempre en español: nombres de variables, textos de la interfaz,
comentarios y mensajes de commit.

---

## 1. Qué es el proyecto

PWA (aplicación web instalable) de identificación y recuperación de
mascotas. Es un proyecto académico de la UNPA, Caleta Olivia, Argentina.

Funcionamiento: la mascota lleva en el collar una placa con un código QR.
Quien la encuentra escanea el QR con la cámara del teléfono, ve la ficha
del animal y puede avisar dónde lo vio, **sin instalar nada y sin
registrarse**. La aplicación instalable es para el dueño, que recibe los
avisos y gestiona la búsqueda.

El nombre viene de la perra del autor del proyecto.

---

## 2. Decisiones de diseño que NO se cambian

Estas decisiones están documentadas y defendidas ante la cátedra. Si una
propuesta las contradice, hay que descartarla:

- **Quien encuentra la mascota nunca instala ni se registra.** Esta es la
  razón de que sea una PWA y no una app nativa. Cualquier función que
  obligue a registrarse antes de avisar está mal.
- **El domicilio se guarda solo como coordenada y jamás se expone.** La
  ficha pública se sirve exclusivamente por la función `ficha_publica()`;
  nunca con un SELECT directo a `mascotas` desde el navegador.
- **La ficha pública no muestra teléfono ni dirección del dueño.** El
  contacto se hace mediante un botón que no revela el número en pantalla.
- **Detección automática de pérdida:** si un escaneo ocurre fuera del
  `radio_metros` configurado para el domicilio, y el modo paseo no está
  activo, se abre un caso en estado `posible_perdida` y se avisa al dueño
  para que confirme o descarte. El collar **no tiene GPS**: la detección
  sucede únicamente cuando alguien escanea.
- **No hay dinero ni recompensas publicadas.** El modelo es de
  *reconocimiento*: queda registrado quién ayudó, el dueño agradece, y
  las veterinarias y forrajerías adheridas ofrecen un agradecimiento
  (descuento, producto o servicio) que el rescatista puede usar o donar a
  un refugio. Nunca mostrar montos ni recompensas económicas en la ficha.
- **Los códigos de placa son aleatorios, no correlativos**, para que las
  fichas no puedan enumerarse probando valores consecutivos.
- **Si el GPS falla o el permiso es denegado, se puede marcar el lugar a
  mano** sobre el mapa o escribir una referencia (historia TRA11). El
  aviso nunca debe depender de un permiso concedido.
- **La IA sugiere, la persona confirma.** Ninguna sugerencia se guarda de
  forma automática. La app debe seguir funcionando si el servicio de IA
  no responde.
- **El sistema contempla perros y gatos** (campo `especie`), no solo
  perros.

---

## 3. Stack tecnológico

Ya instalado y funcionando:
- React + Vite
- react-router-dom
- @supabase/supabase-js
- qrcode.react
- Leaflet + react-leaflet + OpenStreetMap (mapas; **no** Google Maps,
  que exige tarjeta). Sin `StrictMode` en `main.jsx`: el doble montaje
  de React en desarrollo choca con la inicialización de Leaflet.
- vite-plugin-pwa — la app es instalable (manifest + service worker
  autogenerados). El service worker solo se activa en el build de
  producción (`npm run build && npm run preview`), no en `npm run dev`.
  Después de cambiar algo en `public/` (íconos, favicon) hay que
  reconstruir para verlo: `dist/` copia esos archivos al momento del
  build, no los sirve en vivo desde `public/`.
- jsqr — lectura de códigos QR desde la cámara dentro de la propia app
  (`/escanear`), pensado para hacer la demo sin depender del lector de
  QR nativo del celular.

Pendiente de incorporar:
- Recharts (gráficos del panel de analítica)
- API de Claude, modelo Haiku, llamada desde una Edge Function

Infraestructura:
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Vercel: publicado en https://huella-blanca.vercel.app, conectado al
  repositorio de GitHub (deploy automático en cada push a `master`)
- GitHub: `Williamrxzz/huella-blanca` (privado)

Sin librerías de UI por ahora: los estilos son CSS propio en
`src/index.css`. No agregar Tailwind ni shadcn/ui sin consultar.

---

## 4. Entorno de trabajo

- MacBook Air con chip Apple M3, macOS.
- Carpeta del proyecto: `/Users/williamr/huella-blanca`
- Node y npm instalados vía Homebrew. Git 2.39.3 (el de Apple).
- El servidor de desarrollo se levanta con `npm run dev` y queda
  corriendo en `http://localhost:5173`.
- Las credenciales están en `.env.local`, en la raíz del proyecto, con
  las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Ese
  archivo está en `.gitignore` y **no debe subirse ni imprimirse en
  pantalla**. Después de modificarlo hay que reiniciar Vite.

Estructura actual:

```
huella-blanca/
├── .env.local            (credenciales, ignorado por git)
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx           (rutas)
    ├── index.css         (todos los estilos)
    ├── lib/
    │   ├── supabase.js   (cliente de Supabase)
    │   ├── ubicacion.js  (geolocalización compartida, con timeout propio)
    │   └── leaflet-iconos.js (fix de íconos default de Leaflet con Vite)
    └── pages/
        ├── FichaPublica.jsx
        ├── GeneradorQR.jsx
        ├── Login.jsx
        ├── Panel.jsx
        └── AltaMascota.jsx
```

---

## 5. Base de datos (Supabase)

El proyecto en Supabase **ya está creado y poblado**. No hace falta
volver a ejecutar los scripts de esquema. La URL del proyecto es
`https://pgnxanjiswmytdocdhuw.supabase.co`.

### Tablas

`perfiles` — extiende `auth.users`. Campos: id (PK, referencia a
auth.users), nombre, telefono, rol ('usuario' | 'comercio' | 'admin'),
creado_en.

`mascotas` — id, dueno_id (FK a perfiles), nombre, especie ('perro' |
'gato' | 'otro'), sexo ('macho' | 'hembra', nullable — las mascotas
cargadas antes de este campo no lo tienen), raza, tamano ('pequeno' |
'mediano' | 'grande'), color, senas, caracter ('amigable' |
'temerosa' | 'no_acercarse'), foto_url, domicilio_lat, domicilio_lng,
radio_metros (por defecto 1000), pausado_hasta (modo paseo),
mostrar_salud, salud, activa, creado_en.

`placas` — id, codigo (único, aleatorio), mascota_id (FK, puede ser
nulo), estado ('sin_asignar' | 'activa' | 'baja'), creado_en. Al cargar
una mascota se genera y vincula el código al instante (`generar_placa`,
sin costo ni espera — la fricción en el registro es el mayor riesgo del
producto). Si el dueño consigue después una chapita física resistente
con un código propio (por ejemplo de una veterinaria adherida), se
vincula a mano desde el panel (`vincular_placa`) — pero nunca es un
requisito para empezar a usar la app.

`casos_perdida` — id, mascota_id, estado ('posible_perdida' | 'perdida'
| 'cerrada' | 'descartada'), origen ('manual' | 'automatico'), mensaje,
ultima_lat, ultima_lng, iniciado_en, cerrado_en, rescatista_id.
Hay un índice único que impide dos casos abiertos para la misma mascota.

`escaneos` — id, placa_id, mascota_id, lat, lng, distancia_m,
ocurrido_en. Registra **todos** los escaneos, para las estadísticas.

`avistamientos` — id, mascota_id, caso_id, escaneo_id, lat, lng, origen
('gps' | 'manual'), situacion ('conmigo' | 'la_vi_pasar'), mensaje,
foto_url, contacto, reportado_por (nulo si avisó alguien sin cuenta),
creado_en. Registra solo los avisos deliberados.

`comercios` — id, nombre, rubro ('veterinaria' | 'forrajeria' | 'otro'),
direccion, telefono, usuario_id, activo, creado_en.

`agradecimientos` — id, comercio_id, titulo, descripcion, tipo
('descuento' | 'producto' | 'servicio'), vigencia, max_canjes, activo.

`canjes` — id, agradecimiento_id, caso_id, rescatista_id, codigo
(único), estado ('pendiente' | 'retirado' | 'donado' | 'vencido'),
refugio_id, creado_en, usado_en.

`refugios` — id, nombre, contacto, activo.

**Distinción importante:** `escaneos` guarda todos los escaneos de placa;
`avistamientos` guarda solo cuando la persona apretó el botón para
avisar. No mezclarlas.

### Seguridad

RLS está activo en las diez tablas. Las políticas hacen que cada dueño
acceda únicamente a sus mascotas, casos, escaneos y avistamientos.
Política agregada para el registro: `perfiles` permite `insert` a
`authenticated` cuando `auth.uid() = id`, para que un dueño recién
registrado pueda crear su propia fila.

### Funciones (todas `security definer`, ejecutables por `anon`)

- `ficha_publica(p_codigo text)` → JSON con los datos visibles de la
  mascota. Nunca devuelve domicilio ni teléfono. Si no existe la placa o
  no tiene mascota, devuelve `{"encontrada": false}`.
- `registrar_escaneo(p_codigo, p_lat, p_lng)` → registra el escaneo,
  calcula la distancia al domicilio y, si corresponde, abre un caso en
  estado `posible_perdida`.
- `registrar_avistamiento(p_codigo, p_lat, p_lng, p_origen, p_situacion,
  p_mensaje, p_contacto)` → registra el aviso; funciona con o sin cuenta.
- `distancia_metros(lat1, lng1, lat2, lng2)` → fórmula de Haversine.
- `generar_placa(p_mascota_id uuid)` → genera un código aleatorio de 8
  caracteres, crea la placa en estado `activa` vinculada a esa mascota y
  devuelve el código. Valida que la mascota sea del dueño autenticado.
  Solo ejecutable por `authenticated` (no por `anon`).
- `vincular_placa(p_codigo text, p_mascota_id uuid)` → vincula una placa
  ya existente en estado `sin_asignar` a una mascota propia. Devuelve
  `{"ok": true}` o `{"ok": false, "error": "..."}` (`placa_no_encontrada`,
  `placa_ya_asignada`, `mascota_no_encontrada`). Solo `authenticated`.

Desde el frontend se llaman con `supabase.rpc('nombre', { parametros })`.

### Datos de prueba cargados

- Usuario en Authentication con UID
  `8fbf2316-eb8a-4c28-abb0-c5073c3e0d98`, con su perfil creado.
- Mascota "Blanca": perro, mestiza, mediano, negra con pecho
  blanco, amigable, domicilio en Caleta Olivia (-46.4380, -67.5280),
  radio de 1000 metros.
- Placa `C30A45A9` vinculada a esa mascota y en estado activa.
- Otras cuatro placas sin asignar.

Para probar: `http://localhost:5173/m/C30A45A9`

---

## 6. Contexto académico

La cátedra ofrecía dos propuestas (Stand para Evento, Exploradores del
Museo). Este proyecto es una propuesta alternativa aprobada, presentada
con el mismo formato y nivel de detalle.

El sistema cubre los cinco componentes que exige la cátedra:
1. App móvil → la PWA en React
2. Panel web de administración → la misma app, con acceso por rol
3. API/backend → Supabase (API REST automática + Edge Functions)
4. Base de datos → PostgreSQL
5. Módulo de analítica → vistas SQL mostradas con Recharts (pendiente)

### Documentos ya entregados

1. **Historias de Usuario** — 63 historias en siete bloques, con
   prioridad Alta, Media o Baja. Prefijos: DUE (dueño), PER (pérdida y
   reencuentro), TRA (transeúnte o rescatista), REC (reconocimiento),
   ADM (administración), COM (comercio adherido), IA (inteligencia
   artificial), DAT (datos y analítica).
2. **Resumen de tecnología a utilizar** — con la plantilla de la cátedra.
3. **Tecnologías del proyecto** — referencia extendida, con la
   justificación de cada herramienta y las alternativas descartadas.
4. **User Story Mapping** — método de Jeff Patton: ocho actividades como
   columna vertebral, tres versiones y cinco sprints de dos semanas.

### MVP (Versión 1) — 14 historias

DUE01, DUE02, DUE03, DUE04, TRA01, TRA02, TRA04, TRA11, PER01, PER04,
PER05, PER08, ADM01, DAT01.

Criterio: el recorrido mínimo completo para que una mascota perdida
vuelva a su casa. Quedan deliberadamente **fuera** del MVP la detección
automática, los agradecimientos y las funciones de IA, aunque sean lo
más llamativo del proyecto.

### Sprints

- **Sprint 1** — Base y ficha pública: DUE01, DUE02, DUE03, DUE04,
  TRA01, TRA02, ADM01, DAT01.
- **Sprint 2** — Aviso y seguimiento: TRA04, TRA11, PER01, PER04, PER05,
  PER08.
- **Sprint 3** — Detección automática y contacto.
- **Sprint 4** — Reconocimiento, comercios e IA.
- **Sprint 5** — Mejoras y analítica.

Gestión de tareas en Trello: tablero "Huella Blanca – Historias de
Usuario", con siete listas, una por bloque.

---

## 7. Estado actual

### Terminado

- Esquema, políticas de seguridad y funciones ejecutados en Supabase.
- Datos de prueba cargados y verificados.
- `src/lib/supabase.js` — cliente configurado.
- `src/App.jsx` — rutas `/`, `/placas`, `/login`, `/registro`,
  `/panel`, `/mascotas/nueva`, `/mascotas/:id/editar`,
  `/mascotas/:id/mapa`, `/escanear`, `/m/:codigo`. El inicio (`Inicio`)
  revisa si hay sesión de dueño activa y, si la hay, redirige directo
  a `/panel` en vez de mostrar la pantalla de bienvenida — esa
  pantalla es solo para quien todavía no inició sesión.
- `src/pages/Escanear.jsx` (`/escanear`) — lector de QR por cámara
  (`jsqr`) pensado solo para la demo en vivo: si el código leído
  apunta a esta misma app navega con el router, si no abre el link tal
  cual con `window.location.href`.
- `src/pages/FichaPublica.jsx` — muestra la ficha al escanear, con un
  saludo que usa el nombre de la mascota ("¡Hola! Soy {nombre}") para
  que quien la encuentra la llame así y se acerque con más confianza.
  Si hay un caso abierto, muestra una alerta distinta según el estado:
  roja y con un indicador que pulsa si el dueño ya confirmó la
  pérdida, ámbar si es una sospecha automática todavía sin confirmar.
  Al cargar, llama a `registrar_escaneo` (TRA04) pero solo si el
  navegador **ya tenía** el permiso de ubicación concedido de antes —
  nunca se le pide permiso a quien solo está mirando la ficha, eso
  sería fricción innecesaria. Además muestra el botón "La vi acá"
  (TRA11): pide ubicación con `navigator.geolocation` (con límite
  propio de 8 s, porque algunos navegadores no respetan el timeout de
  la API si el permiso de Localización del sistema operativo está
  desactivado) y, la tenga o no, siempre muestra un mapa de Leaflet
  para marcar o corregir el punto exacto tocándolo — si no hay
  ubicación automática, el mapa arranca centrado en Caleta Olivia.
  Llama a `registrar_avistamiento`. Probado con y sin permiso
  concedido.
- `src/pages/GeneradorQR.jsx` — genera y descarga el QR de una placa,
  apuntando siempre al dominio desde el que se sirve la app
  (`window.location.origin`).
- `src/pages/Login.jsx` — login del dueño con email y contraseña, con
  enlace a `/registro`.
- `src/pages/Registro.jsx` (`/registro`) — alta de cuenta de dueño
  (nombre, email, contraseña) para el prototipo: `supabase.auth.signUp`
  y, si Supabase entrega sesión al instante, inserta la fila en
  `perfiles`; si el proyecto pide confirmar el email primero, avisa en
  pantalla en vez de fallar. Necesita la política de RLS que permite a
  cada dueño insertar su propia fila en `perfiles`
  (`auth.uid() = id`), ya aplicada en Supabase.
- `src/pages/Panel.jsx` — lista las mascotas del dueño logueado (foto,
  nombre, especie/raza y el código de placa si ya tiene una activa). Si
  una mascota no tiene placa, muestra un formulario para vincular una
  existente (`vincular_placa`). Cada mascota tiene enlaces para editar,
  ver el mapa de avistamientos, y eliminar (borrado lógico).
- `src/pages/AltaMascota.jsx` — alta **y edición** de mascota (mismo
  formulario; `/mascotas/nueva` crea, `/mascotas/:id/editar` corrige):
  nombre, especie, sexo (obligatorio), raza, tamaño, color, señas,
  carácter, foto (a Storage, bucket `fotos-mascotas`), domicilio
  elegido tocando un mapa de Leaflet (con círculo mostrando el
  `radio_metros`, por defecto 100 m — una cuadra, para que la detección
  automática se dispare cerca y la zona de búsqueda sea manejable) o
  con el botón de ubicación actual. Al crear, genera y vincula la placa
  al instante (`generar_placa`) y lleva directo a descargar el QR; al
  editar, solo actualiza los datos (no toca la placa).
- `src/pages/MapaAvistamientos.jsx` (`/mascotas/:id/mapa`) — mapa de
  Leaflet con el domicilio, el círculo de radio (con leyenda explicando
  qué es, para no confundir) y un marcador por cada avistamiento con
  ubicación; los avisos sin ubicación exacta se listan aparte.
- `src/index.css` — estilos propios.
- Columnas `lat`/`lng` de `avistamientos` pasadas a nullable (se
  necesita para el aviso sin ubicación de TRA11). Columna `sexo`
  agregada a `mascotas` (nullable, check `macho`/`hembra`).
- **PWA instalable** (vite-plugin-pwa): manifest, service worker,
  ícono placeholder de huella blanca sobre rosa (`public/pwa-192.png`,
  `pwa-512.png`, `apple-touch-icon.png`, `favicon.svg`) — reemplazar
  por un diseño propio cuando haya uno.
- Repositorio remoto en GitHub (`Williamrxzz/huella-blanca`, privado).
- **Publicado en Vercel**: https://huella-blanca.vercel.app, conectado
  al repo de GitHub (cada push a `master` hace deploy automático a
  producción). Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
  cargadas en Vercel. Incluye `vercel.json` con reescritura SPA para que
  `/m/:codigo` y `/placas` no den 404.

### Pendiente, en este orden

1. **Panel de administración**: placas, comercios, agradecimientos.
2. **Funciones de IA**: sugerir la ficha desde la foto (IA01), verificar
   la imagen (IA02) y redactar el texto de búsqueda (IA03), siempre
   desde una Edge Function para no exponer la clave de la API.
3. **Módulo de analítica** con Recharts (DAT, pendiente más allá del
   DAT01 ya cubierto).
4. Optimizar el bundle: Vite avisa que el JS de producción pasa los
   500 KB (sobre todo por Leaflet). No es urgente, pero si se nota lento
   en el celular, dividir en chunks con `import()` dinámico.

---

## 8. Cómo trabajar en este proyecto

- Avanzar de a una pantalla o función por vez, probando después de cada
  cambio antes de seguir.
- Los mensajes de commit llevan el código de la historia adelante, por
  ejemplo: `TRA04: envío de ubicación desde la ficha pública`.
- No exponer nunca el contenido de `.env.local`.
- Si una funcionalidad necesita cambios en la base de datos, escribir el
  SQL y avisar para ejecutarlo en el editor de Supabase.
- Ante la duda entre pedir un dato más al usuario o no pedirlo, no
  pedirlo: la fricción en el registro es el mayor riesgo del producto.
