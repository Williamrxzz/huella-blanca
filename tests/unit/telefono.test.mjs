// TRA05: el teléfono del dueño se guarda en formato internacional (E.164),
// que es lo que necesitan los botones tel:/wa.me de la ficha pública.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizarTelefono, telefonoLegible } from '../../src/lib/telefono.js'

const valor = (texto) => {
  const r = normalizarTelefono(texto)
  return r.ok ? r.valor : r.error
}

test('vacío es válido (el teléfono es opcional)', () => {
  assert.equal(valor(''), null)
  assert.equal(valor('   '), null)
  assert.equal(valor(undefined), null)
})

test('celular de Caleta Olivia escrito de las formas habituales', () => {
  for (const texto of [
    '2974123456', '297 412-3456', '0297 15 4123456', '0297-154123456', '297 15 412 3456',
    '+54 9 297 412 3456', '+54 297 412 3456', '+54 0297 15 412 3456',
    '54 9 297 4123456', '5492974123456', '0054 9 297 4123456',
  ]) {
    assert.equal(valor(texto), '+5492974123456', texto)
  }
})

test('otros códigos de área (2, 3 y 4 dígitos)', () => {
  assert.equal(valor('011 15 2345 6789'), '+5491123456789')
  assert.equal(valor('11 2345-6789'), '+5491123456789')
  assert.equal(valor('0351 155 123456'), '+5493515123456')
  assert.equal(valor('02966 15 412345'), '+5492966412345')
})

test('números de otro país se respetan', () => {
  assert.equal(valor('+1 415 555 2671'), '+14155552671')
  assert.equal(valor('+34 612 345 678'), '+34612345678')
})

test('sin código de área, o imposible, no se guarda y se dice por qué', () => {
  assert.equal(valor('4123456'), 'falta_area')
  assert.equal(valor('15 4123456'), 'falta_area')
  assert.equal(valor('abc'), 'invalido')
  assert.equal(valor('29741234567890'), 'invalido')
  assert.equal(valor('9999999999'), 'invalido')
  assert.equal(valor('+0 123'), 'invalido')
})

test('el resultado siempre cumple el check de la base (perfiles_telefono_e164)', () => {
  const e164 = /^\+[1-9][0-9]{7,14}$/
  for (const texto of ['2974123456', '011 15 2345 6789', '+34 612 345 678', '0054 9 297 4123456']) {
    assert.match(valor(texto), e164, texto)
  }
})

test('telefonoLegible', () => {
  assert.equal(telefonoLegible('+5492974123456'), '+54 9 2974123456')
  assert.equal(telefonoLegible('+34612345678'), '+34612345678')
  assert.equal(telefonoLegible(null), '')
})
