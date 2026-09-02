const test = require('node:test')
const assert = require('node:assert')

const {
  shopNowForPrompt,
  SYSTEM_PROMPT_TEMPLATE,
} = require('../src/services/chatbot.service')

// Contexto mínimo: al prompt solo le interesa acá el bloque de fecha.
const ctx = {
  shopName: 'Barbería Test',
  address: 'Calle 1',
  phone: '300',
  barbers: [],
  services: [],
  schedule: 'Domingo: Cerrado, Lunes: Cerrado, Martes: 09:00–20:00',
}

// El caso reportado: martes 1 de septiembre de 2026, 15:33 hora Colombia.
// En UTC ese instante son las 20:33 del mismo día.
const MARTES_1533_CO = new Date('2026-09-01T20:33:00.000Z')

test('la fecha del prompt se lee en la zona de la barbería, no en UTC', () => {
  const ahora = shopNowForPrompt(MARTES_1533_CO)
  assert.strictEqual(ahora.date, '2026-09-01')
  assert.strictEqual(ahora.time, '15:33')
})

test('el día de la semana es el real, no uno inventado por el modelo', () => {
  assert.strictEqual(shopNowForPrompt(MARTES_1533_CO).dayName, 'Martes')
})

test('a las 19:00 hora Colombia el servidor UTC ya está en el día siguiente y el prompt no', () => {
  // 2026-09-01T05:30Z son las 00:30 del 1 en Colombia: mismo día civil allá,
  // y el día anterior no debe filtrarse.
  const madrugada = shopNowForPrompt(new Date('2026-09-01T05:30:00.000Z'))
  assert.strictEqual(madrugada.date, '2026-09-01')
  assert.strictEqual(madrugada.dayName, 'Martes')

  // 2026-09-02T02:00Z son las 21:00 del 1 en Colombia: UTC ya pasó al 2,
  // la barbería sigue en el 1.
  const nocheCerrada = shopNowForPrompt(new Date('2026-09-02T02:00:00.000Z'))
  assert.strictEqual(nocheCerrada.date, '2026-09-01')
  assert.strictEqual(nocheCerrada.dayName, 'Martes')
})

test('el system prompt lleva el ancla temporal explícita', () => {
  const prompt = SYSTEM_PROMPT_TEMPLATE(ctx, shopNowForPrompt(MARTES_1533_CO))
  assert.match(prompt, /Hoy es Martes 2026-09-01 y en la barbería son las 15:33\./)
  assert.ok(prompt.includes('AUTORIDAD ABSOLUTA'))
  // El nombre del día tiene que estar cruzado contra HORARIOS, que es donde
  // el modelo decidía "cerrado" sobre el día equivocado.
  assert.ok(prompt.includes('HORARIOS'))
})

test('el ancla va después del bloque estable del prompt', () => {
  // Lo volátil al final: si algún día se activa prompt caching, el prefijo
  // cacheable (barberos, servicios, reglas) no se invalida cada minuto.
  const prompt = SYSTEM_PROMPT_TEMPLATE(ctx, shopNowForPrompt(MARTES_1533_CO))
  assert.ok(prompt.indexOf('FECHA Y HORA ACTUALES') > prompt.indexOf('REGLAS DE DESAMBIGUACIÓN'))
})

test('sin el ancla el prompt no mencionaba ninguna fecha (regresión)', () => {
  const prompt = SYSTEM_PROMPT_TEMPLATE(ctx, shopNowForPrompt(MARTES_1533_CO))
  const fechas = prompt.match(/\d{4}-\d{2}-\d{2}/g) || []
  assert.ok(fechas.length > 0, 'el prompt debe llevar la fecha de hoy')
  assert.ok(fechas.every(f => f === '2026-09-01'))
})
