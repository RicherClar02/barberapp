const test = require('node:test')
const assert = require('node:assert')

// Los helpers de zona son puros: no tocan Prisma ni red, así que se piden
// directo sin sembrar el require cache.
const {
  shopTodayUtcMidnight,
  endOfShopDay,
  shopUtcOffsetMs,
} = require('../src/services/shared/slots.service')

const BOGOTA = 'America/Bogota'

// Una oferta "del 1 al 30 de septiembre" se guarda así: días de calendario a
// medianoche UTC. Es la representación que produce `new Date("2026-09-01")`.
const OFERTA = {
  isActive: true,
  validFrom: new Date('2026-09-01T00:00:00.000Z'),
  validUntil: new Date('2026-09-30T00:00:00.000Z'),
}

// El criterio que ahora usan las queries y el flag `vigente`.
const estaVigente = (offer, now) => {
  const hoy = shopTodayUtcMidnight(now, BOGOTA)
  return offer.isActive && offer.validFrom <= hoy && offer.validUntil >= hoy
}

test('el offset de Bogota es -5h y no depende de la hora del proceso', () => {
  const enero = shopUtcOffsetMs(new Date('2026-01-15T12:00:00Z'), BOGOTA)
  const julio = shopUtcOffsetMs(new Date('2026-07-15T12:00:00Z'), BOGOTA)
  assert.strictEqual(enero, -5 * 60 * 60 * 1000)
  // Colombia no tiene horario de verano: mismo offset en cualquier mes.
  assert.strictEqual(julio, enero)
})

test('hoy en la barberia se toma de la zona, no del reloj UTC', () => {
  // 31 de agosto 20:00 en Bogotá ya es 1 de septiembre en UTC. El día de la
  // barbería sigue siendo el 31: es justo el desfase que corría la vigencia.
  const now = new Date('2026-09-01T01:00:00.000Z')
  assert.strictEqual(
    shopTodayUtcMidnight(now, BOGOTA).toISOString(),
    '2026-08-31T00:00:00.000Z'
  )
})

test('el dia de calendario termina al final del dia local, no a su medianoche', () => {
  // 23:59:59.999 del 30 de septiembre en Bogotá = 04:59:59.999Z del 1 de octubre.
  assert.strictEqual(
    endOfShopDay(OFERTA.validUntil, BOGOTA).toISOString(),
    '2026-10-01T04:59:59.999Z'
  )
})

test('la oferta NO arranca la vispera aunque en UTC ya sea el dia siguiente', () => {
  // 31 de agosto 20:00 Bogotá. Comparado crudo, validFrom (1 sep 00:00Z) <= now
  // (1 sep 01:00Z) daba true y la oferta arrancaba 5 horas antes.
  assert.strictEqual(estaVigente(OFERTA, new Date('2026-09-01T01:00:00.000Z')), false)
})

test('la oferta vale desde el arranque de su primer dia', () => {
  // 1 de septiembre 09:00 Bogotá.
  assert.strictEqual(estaVigente(OFERTA, new Date('2026-09-01T14:00:00.000Z')), true)
})

// Este es el caso que motivó el arreglo: durante TODO el último día la oferta
// figuraba vencida, porque validUntil es la medianoche de ese día.
test('la oferta sigue vigente durante todo su ultimo dia', () => {
  for (const iso of [
    '2026-09-30T05:00:00.000Z', // 00:00 Bogotá
    '2026-09-30T14:00:00.000Z', // 09:00 Bogotá
    '2026-10-01T03:00:00.000Z', // 22:00 Bogotá
    '2026-10-01T04:59:59.000Z', // 23:59 Bogotá
  ]) {
    assert.strictEqual(estaVigente(OFERTA, new Date(iso)), true, iso)
  }
})

test('la oferta vence al pasar su ultimo dia', () => {
  // 1 de octubre 09:00 Bogotá.
  assert.strictEqual(estaVigente(OFERTA, new Date('2026-10-01T14:00:00.000Z')), false)
})

test('la cuenta regresiva no llega a cero mientras la oferta valga', () => {
  // 09:00 Bogotá del último día: quedan ~15h, no 0.
  const now = new Date('2026-09-30T14:00:00.000Z')
  const msLeft = endOfShopDay(OFERTA.validUntil, BOGOTA) - now
  const horas = Math.floor(msLeft / (1000 * 60 * 60))
  assert.ok(msLeft > 0, 'debe quedar tiempo durante el último día')
  assert.strictEqual(horas, 14)

  // Comparado crudo daba negativo, que es lo que mostraba "Vencida".
  assert.ok(OFERTA.validUntil - now < 0)
})

test('el panel y el backend coinciden en el mismo instante', () => {
  // Réplica del criterio del panel (web/src/utils/formatters.js): día local de
  // inicio y fin de día local para el vencimiento. Debe dar lo mismo que el
  // backend en los bordes, que era justo donde discrepaban.
  const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z?)?$/
  const toDisplayDate = (v) => {
    const m = new Date(v).toISOString().match(CALENDAR_DAY)
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date(v)
  }

  for (const iso of [
    '2026-09-01T01:00:00.000Z',
    '2026-09-01T14:00:00.000Z',
    '2026-09-30T14:00:00.000Z',
    '2026-10-01T14:00:00.000Z',
  ]) {
    const now = new Date(iso)
    const hoy = shopTodayUtcMidnight(now, BOGOTA)
    const backend = OFERTA.validFrom <= hoy && OFERTA.validUntil >= hoy
    const panel = toDisplayDate(OFERTA.validFrom) <= hoy && toDisplayDate(OFERTA.validUntil) >= hoy
    assert.strictEqual(backend, panel, `discrepan en ${iso}`)
  }
})
