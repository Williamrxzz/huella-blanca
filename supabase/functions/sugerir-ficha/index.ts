// IA01 + IA02, en una sola llamada: la misma foto, el mismo pedido.
// La IA sugiere, la persona confirma. Nada se guarda de forma automática
// acá — esta función solo devuelve una sugerencia; quien la llama decide
// qué hacer con ella.

const PROMPT = `Sos un asistente que ayuda a completar la ficha de una mascota (perro o gato) para una app de identificación de mascotas perdidas.

Analizá la imagen y respondé ÚNICAMENTE con un JSON válido, sin texto adicional, sin explicaciones y sin bloques de código (nada de \`\`\`), con esta forma exacta:

{
  "categoria": "apta" | "incorrecta" | "inapropiada",
  "motivo": string o null,
  "sugerencia": { "especie": "perro" | "gato" | "otro", "raza": string, "tamano": "pequeno" | "mediano" | "grande", "color": string, "senas": string } o null
}

Reglas para elegir "categoria":

- "apta": la imagen muestra con claridad un perro, un gato u otra mascota doméstica, con nitidez suficiente para describirla. Completá "sugerencia" con tu mejor estimación a partir de lo que se ve. Si es mestizo, describí la cruza probable en "raza" (por ejemplo "mezcla de labrador con algo de collie") en vez de forzar una raza pura. "motivo" tiene que ser null.

  En "senas" describí ÚNICAMENTE rasgos físicos permanentes que sirvan para identificar a ese animal en otro momento: manchas, cicatrices, forma de las orejas o la cola, marcas particulares en el pelaje. NUNCA describas la pose, la expresión o el momento de la foto (por ejemplo "lengua afuera", "sentado", "mojado", "corriendo", "mirando a cámara") — eso no ayuda a identificarlo y no tiene que aparecer en "senas".

- "incorrecta": la foto no permite identificar un animal con confianza (está borrosa, oscura, cortada, muy lejana, o no hay un animal en la imagen). Es un problema de la FOTO, no de contenido. "sugerencia" tiene que ser null. "motivo": una frase breve y neutra explicando qué falla (por ejemplo "No se distingue un animal en la imagen" o "La foto está demasiado borrosa").

- "inapropiada": la imagen tiene contenido ofensivo, violento, sexual o que de cualquier forma no debería aparecer en una ficha pública, más allá de si hay o no un animal presente. "sugerencia" tiene que ser null. "motivo": una frase breve y neutra, sin describir el contenido en detalle.

Devolvé únicamente el JSON.`

function extraerJson(texto: string) {
  const limpio = texto.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '')
  return JSON.parse(limpio)
}

const CATEGORIAS_VALIDAS = ['apta', 'incorrecta', 'inapropiada']
const ESPECIES_VALIDAS = ['perro', 'gato', 'otro']
const TAMANOS_VALIDOS = ['pequeno', 'mediano', 'grande']

// Los mismos valores que aceptan los checks de la tabla "mascotas". Si el
// modelo devuelve algo fuera de la lista, el campo vuelve vacío en vez de
// arriesgarse a romper el guardado más adelante.
function normalizarSugerencia(sugerencia: any) {
  if (!sugerencia || typeof sugerencia !== 'object') return null
  return {
    especie: ESPECIES_VALIDAS.includes(sugerencia.especie) ? sugerencia.especie : '',
    raza: typeof sugerencia.raza === 'string' ? sugerencia.raza : '',
    tamano: TAMANOS_VALIDOS.includes(sugerencia.tamano) ? sugerencia.tamano : '',
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
    motivo: typeof json.motivo === 'string' ? json.motivo : null,
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
        max_tokens: 500,
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
    const texto = datos.content?.[0]?.text ?? ''
    const sugerencia = normalizarRespuesta(extraerJson(texto))

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
