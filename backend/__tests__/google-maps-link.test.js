const test = require('node:test')
const assert = require('node:assert')

// El parser es puro (no toca Prisma ni red salvo por el fetch que se inyecta),
// así que se puede pedir directo sin sembrar el require cache.
const {
  extractCoordinates,
  isGoogleHost,
  isShortLink,
  isInColombia,
  resolveMapLink,
} = require('../src/utils/googleMaps')

// ─── Parseo de los formatos que realmente pega un dueño ──────────────────

test('extrae las coordenadas del marcador (!3d/!4d)', () => {
  const url = 'https://www.google.com/maps/place/Barberia/@4.6000,-74.0900,17z/data=!3m1!4b1!4m6!3m5!8m2!3d4.6097!4d-74.0817'
  assert.deepStrictEqual(extractCoordinates(url), { latitude: 4.6097, longitude: -74.0817 })
})

// El @ es hacia dónde apunta la cámara del mapa; el !3d/!4d es el local. Cuando
// vienen los dos pueden diferir varias cuadras y el que sirve es el del local.
test('el marcador gana sobre el centro de la camara', () => {
  const url = 'https://www.google.com/maps/place/X/@4.6000,-74.0900,17z/data=!8m2!3d4.6097!4d-74.0817'
  const coords = extractCoordinates(url)
  assert.strictEqual(coords.latitude, 4.6097)
  assert.notStrictEqual(coords.latitude, 4.6)
})

test('usa el centro de la camara cuando no hay marcador', () => {
  assert.deepStrictEqual(
    extractCoordinates('https://www.google.com/maps/@4.6097,-74.0817,17z'),
    { latitude: 4.6097, longitude: -74.0817 }
  )
})

test('lee las coordenadas de los parametros de consulta', () => {
  for (const url of [
    'https://maps.google.com/?q=4.6097,-74.0817',
    'https://www.google.com/maps/search/?api=1&query=4.6097,-74.0817',
  ]) {
    assert.deepStrictEqual(extractCoordinates(url), { latitude: 4.6097, longitude: -74.0817 }, url)
  }
})

test('acepta coordenadas pegadas a mano, sin link', () => {
  assert.deepStrictEqual(extractCoordinates('4.6097, -74.0817'), { latitude: 4.6097, longitude: -74.0817 })
})

test('devuelve null cuando no hay nada que parsear', () => {
  assert.strictEqual(extractCoordinates('no es un link'), null)
  assert.strictEqual(extractCoordinates(''), null)
})

// ─── Lista de hosts: es la defensa contra SSRF ───────────────────────────

test('reconoce los hosts de Google y rechaza el resto', () => {
  for (const host of ['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'maps.google.com', 'google.com.co']) {
    assert.strictEqual(isGoogleHost(host), true, host)
  }
  // google.com.evil.com es el caso que un `includes("google.com")` dejaría pasar.
  for (const host of ['evil.com', 'google.com.evil.com', 'localhost', '169.254.169.254']) {
    assert.strictEqual(isGoogleHost(host), false, host)
  }
})

test('distingue el link corto, que es el unico que necesita red', () => {
  assert.strictEqual(isShortLink('https://maps.app.goo.gl/AbCdEf123'), true)
  assert.strictEqual(isShortLink('https://www.google.com/maps/@4.6,-74.0,17z'), false)
})

// Un link de otro dominio que lleve "@4.6,-74.0" en la ruta calza con el patrón
// del parser. Si el host no se validara ANTES, entraría por parecido de texto.
test('rechaza un link ajeno aunque su texto contenga coordenadas', async () => {
  await assert.rejects(
    () => resolveMapLink('https://evil.com/maps/@4.6,-74.0,17z'),
    /no es de Google Maps/
  )
})

test('valida el host en cada salto del redirect', async () => {
  // Un host de Google que redirige a la metadata de la nube: si solo se validara
  // la URL original, el servidor haría esa petición por cuenta del atacante.
  const fetchHaciaMetadata = async () => ({
    headers: { get: () => 'http://169.254.169.254/latest/meta-data/' },
  })
  await assert.rejects(
    () => resolveMapLink('https://maps.app.goo.gl/AbCdEf123', fetchHaciaMetadata),
    /No pudimos leer ese link/
  )
})

test('sigue el redirect de un link corto hasta las coordenadas', async () => {
  const fetchGoogle = async (url) =>
    url.includes('goo.gl')
      ? { headers: { get: () => 'https://www.google.com/maps/place/X/data=!8m2!3d4.142!4d-73.6266' } }
      : { headers: { get: () => null } }

  assert.deepStrictEqual(
    await resolveMapLink('https://maps.app.goo.gl/AbCdEf123', fetchGoogle),
    { latitude: 4.142, longitude: -73.6266 }
  )
})

test('si el fetch falla devuelve el mensaje que le dice al dueño que hacer', async () => {
  const fetchQueFalla = async () => { throw new Error('ETIMEDOUT') }
  await assert.rejects(
    () => resolveMapLink('https://maps.app.goo.gl/AbCdEf123', fetchQueFalla),
    /copia el link de la barra|copiá el link de la barra/
  )
})

// ─── Límites de Colombia ─────────────────────────────────────────────────

test('acepta puntos dentro de Colombia, continentales e insulares', () => {
  assert.strictEqual(isInColombia(4.6097, -74.0817), true)  // Bogotá
  assert.strictEqual(isInColombia(4.142, -73.6266), true)   // Villavicencio
  assert.strictEqual(isInColombia(12.5847, -81.7006), true) // San Andrés
})

test('rechaza puntos fuera de Colombia', async () => {
  assert.strictEqual(isInColombia(40.7128, -74.006), false) // Nueva York
  assert.strictEqual(isInColombia(-34.6037, -58.3816), false) // Buenos Aires
  await assert.rejects(
    () => resolveMapLink('https://www.google.com/maps/@40.7128,-74.0060,17z'),
    /fuera de Colombia/
  )
})

test('pide el link cuando llega vacio', async () => {
  await assert.rejects(() => resolveMapLink(''), /Pegá el link/)
  await assert.rejects(() => resolveMapLink(null), /Pegá el link/)
})

test('redondea a 6 decimales', async () => {
  const coords = await resolveMapLink('https://www.google.com/maps/@4.60971234567,-74.08171234567,17z')
  assert.strictEqual(coords.latitude, 4.609712)
  assert.strictEqual(coords.longitude, -74.081712)
})
