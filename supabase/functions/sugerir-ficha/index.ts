// IA01 + IA02, en una sola llamada: la misma foto, el mismo pedido.
// La IA sugiere, la persona confirma. Nada se guarda de forma automática
// acá — esta función solo devuelve una sugerencia; quien la llama decide
// qué hacer con ella.

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

Deno.serve(async (req) => {
  const encabezadosCors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: encabezadosCors })
  }

  try {
    const { imagen_base64, media_type } = await req.json()

    if (!imagen_base64 || !media_type) {
      return new Response(JSON.stringify({ error: 'faltan imagen_base64 o media_type' }), {
        status: 400,
        headers: { ...encabezadosCors, 'content-type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'falta configurar ANTHROPIC_API_KEY' }), {
        status: 500,
        headers: { ...encabezadosCors, 'content-type': 'application/json' },
      })
    }

    const controlador = new AbortController()
    const timeout = setTimeout(() => controlador.abort(), 15000)

    const respuestaClaude = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controlador.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        tools: [HERRAMIENTA_CLASIFICAR],
        tool_choice: { type: 'tool', name: 'clasificar_foto' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type, data: imagen_base64 } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    }).finally(() => clearTimeout(timeout))

    if (!respuestaClaude.ok) {
      const detalle = await respuestaClaude.text()
      return new Response(JSON.stringify({ error: 'error_api_claude', detalle }), {
        status: 502,
        headers: { ...encabezadosCors, 'content-type': 'application/json' },
      })
    }

    const datos = await respuestaClaude.json()
    const llamada = datos.content?.find((bloque: any) => bloque.type === 'tool_use')

    // Si el modelo no devolvió una clasificación (por ejemplo se negó a
    // analizar la imagen), no se inventa una categoría: se informa como error
    // técnico y quien llama deja pasar la foto sin verificar.
    if (!llamada?.input) {
      return new Response(
        JSON.stringify({ error: 'sin_clasificacion', detalle: datos.stop_reason ?? null }),
        { status: 502, headers: { ...encabezadosCors, 'content-type': 'application/json' } }
      )
    }

    const sugerencia = normalizarRespuesta(llamada.input)

    return new Response(JSON.stringify(sugerencia), {
      headers: { ...encabezadosCors, 'content-type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'fallo_interno', detalle: String(error) }), {
      status: 500,
      headers: { ...encabezadosCors, 'content-type': 'application/json' },
    })
  }
})
