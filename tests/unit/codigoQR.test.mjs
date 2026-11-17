// /escanear: qué hacer con el texto que trae un QR. Solo se sigue un link de la
// propia app; uno http(s) ajeno se muestra y se confirma; el resto se rechaza
// (antes, un QR con `javascript:` ejecutaba código dentro de la app).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { interpretarCodigo } from '../../src/lib/codigoQR.js'

const ORIGEN = 'https://huella-blanca.vercel.app'

test('link de la propia app → navegar con el router', () => {
  assert.deepEqual(interpretarCodigo(`${ORIGEN}/m/C30A45A9`, ORIGEN), { tipo: 'propio', ruta: '/m/C30A45A9' })
  assert.deepEqual(interpretarCodigo(`${ORIGEN}/m/ABC?x=1`, ORIGEN), { tipo: 'propio', ruta: '/m/ABC?x=1' })
})

test('link web de otro sitio → se muestra y se pide confirmación', () => {
  assert.deepEqual(interpretarCodigo('https://otro-sitio.com/x', ORIGEN), { tipo: 'externo', url: 'https://otro-sitio.com/x' })
  assert.equal(interpretarCodigo('http://huella-blanca.vercel.app.evil.com/m/1', ORIGEN).tipo, 'externo')
})

test('esquemas peligrosos o que no son web → rechazados', () => {
  for (const texto of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd',
    'intent://x#Intent;end', 'vbscript:x', 'blob:https://x/1',
  ]) {
    assert.equal(interpretarCodigo(texto, ORIGEN).tipo, 'invalido', texto)
  }
})

test('texto que no es un link → inválido', () => {
  assert.equal(interpretarCodigo('hola', ORIGEN).tipo, 'invalido')
  assert.equal(interpretarCodigo('C30A45A9', ORIGEN).tipo, 'invalido')
  assert.equal(interpretarCodigo('', ORIGEN).tipo, 'invalido')
})
