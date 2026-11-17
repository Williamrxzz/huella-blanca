// Clasificación de una foto con Claude Haiku, compartida por las funciones
// `sugerir-ficha` (al elegir la foto) y `subir-foto` (al guardarla, si no
// trae un pase vigente). La IA sugiere, la persona confirma: acá no se guarda
// nada, solo se devuelve una categoría y, si hay un animal, una sugerencia.

// Esta función solo CLASIFICA el contenido de la imagen para una app de fichas
// de mascotas. Nunca se le pide identificar ni describir a una persona: si
// hay una persona, la respuesta es simplemente "no hay un animal". Eso evita
// que el modelo se niegue a contestar por tratarse de alguien identificable.
const PROMPT = `Tu única tarea es clasificar el contenido de una imagen para una app de fichas de mascotas (perros, gatos u otros animales domésticos). Respondé llamando a la herramienta clasificar_foto.

IMPORTANTE: no identifiques, no nombres y no describas a ninguna persona, sea quien sea. Si en la imagen aparece una persona, solo tenés que decidir si además hay un animal; si no lo hay, la categoría es "sin_animal".

Reglas para elegir "categoria":

- "apta": la imagen muestra con claridad un perro, un gato u otra mascota doméstica, con nitidez suficiente para describirla. Si además aparece una persona (por ejemplo, alguien con su perro), igual es "apta": describí únicamente al animal. Completá "sugerencia" con tu mejor estimación a partir de lo que se ve del animal. Si es mestizo, describí la cruza probable en "raza" (por ejemplo "mezcla de labrador con algo de collie") en vez de forzar una raza pura. "motivo" tiene que ser null.

  En "senas" describí ÚNICAMENTE rasgos físicos permanentes que sirvan para identificar a ese animal en otro momento: manchas, cicatrices, forma de las orejas o la cola, marcas particulares en el pelaje. NUNCA describas la pose, la expresión o el momento de la foto (por ejemplo "lengua afuera", "sentado", "mojado", "corriendo", "mirando a cámara") — eso no ayuda a identificarlo y no tiene que aparecer en "senas".

- "sin_animal": en la imagen NO hay ningún animal: solo hay una persona, un objeto, un paisaje, una pantalla, un documento, un dibujo sin animal, etc. Usá esta categoría solo cuando estés seguro de que no hay ningún animal; si hay un animal pero no se ve bien, usá "incorrecta". "sugerencia" tiene que ser null. "motivo": siempre "No hay un animal en la imagen", sin describir lo que sí se ve.

- "incorrecta": SÍ hay un animal en la imagen, pero la foto no permite describirlo con confianza (está borrosa, oscura, cortada o muy lejana). Es un problema de la FOTO, no de contenido. "sugerencia" tiene que ser null. "motivo": una frase breve y neutra explicando qué falla (por ejemplo "La foto está demasiado borrosa").

- "inapropiada": la imagen tiene contenido ofensivo, violento, sexual o que de cualquier forma no debería aparecer en una ficha pública, más allá de si hay o no un animal presente. "sugerencia" tiene que ser null. "motivo": una frase breve y neutra, sin describir el contenido en detalle.`

// La respuesta se pide como llamada obligatoria a esta herramienta: el modelo
// siempre devuelve una categoría estructurada, nunca texto libre que haya que
// interpretar (y que podría ser una negativa a analizar la foto).
const HERRAMIENTA_CLASIFICAR = {
  name: 'clasificar_foto',
  description: 'Registra la clasificación de la foto y, si es una mascota, la sugerencia de ficha.',
  input_schema: {
    type: 'object',
    properties: {
      categoria: { type: 'string', enum: ['apta', 'sin_animal', 'incorrecta', 'inapropiada'] },
      motivo: { type: 'string', description: 'Frase breve y neutra; vacío si la categoría es "apta".' },
      sugerencia: {
        type: 'object',
        description: 'Solo si la categoría es "apta".',
        properties: {
          especie: { type: 'string', enum: ['perro', 'gato', 'otro'] },
          raza: { type: 'string' },
          tamano: { type: 'string', enum: ['pequeno', 'mediano', 'grande'] },
          color: { type: 'string' },
          senas: { type: 'string' },
        },
        required: ['especie', 'raza', 'tamano', 'color', 'senas'],
      },
    },
    required: ['categoria'],
  },
}

const CATEGORIAS_VALIDAS = ['apta', 'sin_animal', 'incorrecta', 'inapropiada']
const ESPECIES_VALIDAS = ['perro', 'gato', 'otro']
const TAMANOS_VALIDOS = ['pequeno', 'mediano', 'grande']

// Los mismos valores que aceptan los checks de la tabla "mascotas". Si el
// modelo devuelve algo fuera de la lista, el campo vuelve vacío en vez de
// arriesgarse a romper el guardado más adelante.
// El modelo a veces escribe "pequeño" con tilde o con mayúscula inicial: se
// compara sin tildes ni mayúsculas, y siempre se devuelve el valor de la lista.
function sinTildes(valor: unknown) {
  return typeof valor === 'string'
    ? valor.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
    : ''
}

function normalizarSugerencia(sugerencia: any) {
  if (!sugerencia || typeof sugerencia !== 'object') return null
  const especie = sinTildes(sugerencia.especie)
  const tamano = sinTildes(sugerencia.tamano)
  return {
    especie: ESPECIES_VALIDAS.includes(especie) ? especie : '',
    raza: typeof sugerencia.raza === 'string' ? sugerencia.raza : '',
    tamano: TAMANOS_VALIDOS.includes(tamano) ? tamano : '',
    color: typeof sugerencia.color === 'string' ? sugerencia.color : '',
    senas: typeof sugerencia.senas === 'string' ? sugerencia.senas : '',
  }
}

function normalizarRespuesta(json: any) {
  if (!CATEGORIAS_VALIDAS.includes(json?.categoria)) {
    throw new Error('categoria_invalida')
  }
  return {
    categoria: json.categoria,
    motivo: typeof json.motivo === 'string' && json.motivo.trim() ? json.motivo : null,
    sugerencia: json.categoria === 'apta' ? normalizarSugerencia(json.sugerencia) : null,
  }
}

export type Clasificacion = {
  categoria: 'apta' | 'sin_animal' | 'incorrecta' | 'inapropiada'
  motivo: string | null
  sugerencia: Record<string, string> | null
}

// Devuelve { ok: true, clasificacion } o { ok: false, error, detalle, status }.
// Un fallo técnico (API caída, timeout, el modelo no clasificó) NO es una
// categoría: quien llama decide dejar pasar la foto sin verificar.
export async function clasificarImagen(imagen_base64: string, media_type: string) {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return { ok: false as const, error: 'falta configurar ANTHROPIC_API_KEY', detalle: null, status: 500 }

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), 15000)
  try {
    const respuestaClaude = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controlador.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        tools: [HERRAMIENTA_CLASIFICAR],
        tool_choice: { type: 'tool', name: 'clasificar_foto' },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type, data: imagen_base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!respuestaClaude.ok) {
      return { ok: false as const, error: 'error_api_claude', detalle: await respuestaClaude.text(), status: 502 }
    }
    const datos = await respuestaClaude.json()
    const llamada = datos.content?.find((bloque: any) => bloque.type === 'tool_use')
    // Si el modelo no devolvió una clasificación (por ejemplo se negó a
    // analizar la imagen), no se inventa una categoría.
    if (!llamada?.input) return { ok: false as const, error: 'sin_clasificacion', detalle: datos.stop_reason ?? null, status: 502 }
    return { ok: true as const, clasificacion: normalizarRespuesta(llamada.input) as Clasificacion }
  } catch (error) {
    return { ok: false as const, error: 'fallo_interno', detalle: String(error), status: 500 }
  } finally {
    clearTimeout(timeout)
  }
}
