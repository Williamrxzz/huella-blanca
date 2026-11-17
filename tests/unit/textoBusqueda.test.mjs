// IA03: el texto para compartir la búsqueda respeta las reglas de privacidad
// de la ficha pública: sin teléfono, sin domicilio, sin el mensaje privado del
// dueño, señas solo si son públicas y ubicación redondeada.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { armarTextoBusqueda, enlaceWhatsApp } from '../../src/lib/textoBusqueda.js'

const ORIGEN = 'https://huella-blanca.vercel.app'
const mascota = {
  nombre: 'Blanca',
  especie: 'perro',
  sexo: 'hembra',
  tamano: 'mediano',
  raza: 'Mestiza',
  color: 'Negra con pecho blanco',
  senas: 'Mancha blanca en la pata',
  visibilidad_senas: 'publico',
  domicilio_lat: -46.438012,
  domicilio_lng: -67.528034,
  placas: [{ codigo: 'VIEJA111', estado: 'baja' }, { codigo: 'C30A45A9', estado: 'activa' }],
}
const caso = { ultima_lat: -46.443612, ultima_lng: -67.518134, mensaje: 'Mensaje privado del dueño', iniciado_en: '2026-11-17T10:00:00Z' }

test('arma el texto con los datos públicos y el enlace de la placa activa', () => {
  const texto = armarTextoBusqueda({ mascota, caso, origen: ORIGEN })
  assert.match(texto, /^¡SE PERDIÓ BLANCA!/)
  assert.match(texto, /Blanca es una perra de tamaño mediano\./)
  assert.match(texto, /Raza: Mestiza/)
  assert.match(texto, /Señas: Mancha blanca en la pata/)
  assert.ok(texto.includes(`${ORIGEN}/m/C30A45A9`))
  assert.ok(!texto.includes('VIEJA111'), 'no usa la placa dada de baja')
})

test('nunca incluye el mensaje privado ni el domicilio', () => {
  const texto = armarTextoBusqueda({ mascota, caso, origen: ORIGEN })
  assert.ok(!texto.includes('Mensaje privado'))
  assert.ok(!texto.includes('-46.438'), 'no aparece la latitud del domicilio')
  assert.ok(!texto.includes('-67.528'), 'no aparece la longitud del domicilio')
})

test('la última ubicación va redondeada a 3 decimales (≈110 m)', () => {
  const texto = armarTextoBusqueda({ mascota, caso, origen: ORIGEN })
  assert.ok(texto.includes('q=-46.444,-67.518'))
  assert.ok(!texto.includes('-46.443612'))
})

test('señas privadas no se publican', () => {
  const texto = armarTextoBusqueda({ mascota: { ...mascota, visibilidad_senas: 'privado' }, caso, origen: ORIGEN })
  assert.ok(!texto.includes('Mancha blanca'))
})

test('sin emojis (wa.me los muestra como "�")', () => {
  const texto = armarTextoBusqueda({ mascota, caso, origen: ORIGEN })
  assert.ok(!/\p{Extended_Pictographic}/u.test(texto))
})

test('con datos faltantes se arma igual', () => {
  const texto = armarTextoBusqueda({ mascota: { nombre: 'Michi', especie: 'gato' }, caso: null, origen: ORIGEN })
  assert.match(texto, /Michi es un gato\./)
  assert.match(texto, /por favor avisá al dueño/)
  assert.ok(!texto.includes('maps'))
})

test('enlaceWhatsApp codifica el texto', () => {
  assert.equal(enlaceWhatsApp('a b&c'), 'https://wa.me/?text=a%20b%26c')
})
