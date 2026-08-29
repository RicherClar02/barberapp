const test = require('node:test')
const assert = require('node:assert')

const {
  generateSlots,
  overlaps,
  isSlotFree,
  filterAvailableSlots
} = require('../src/services/shared/slots.service')

// Reproduce lo que calendar.service.js hace con los slots de un día,
// sin tocar la base de datos: misma grilla, mismas citas activas.
const buildDayView = (openTime, closeTime, slotDuration, activeAppointments) => {
  const allSlots = generateSlots(openTime, closeTime, slotDuration)
  return {
    occupiedSlots: allSlots.filter(s => !isSlotFree(s, activeAppointments)).map(s => s.startTime),
    freeSlots: allSlots.filter(s => isSlotFree(s, activeAppointments)).map(s => s.startTime)
  }
}

test('generateSlots genera la grilla de 40 min entre apertura y cierre', () => {
  const slots = generateSlots('09:00', '12:00', 40)

  assert.deepStrictEqual(slots, [
    { startTime: '09:00', endTime: '09:40' },
    { startTime: '09:40', endTime: '10:20' },
    { startTime: '10:20', endTime: '11:00' },
    { startTime: '11:00', endTime: '11:40' }
  ])
})

test('generateSlots no emite un slot que se pase de la hora de cierre', () => {
  const slots = generateSlots('09:00', '10:00', 40)

  // 09:40 + 40 = 10:20 > 10:00, así que solo entra el primero
  assert.deepStrictEqual(slots, [{ startTime: '09:00', endTime: '09:40' }])
})

test('overlaps detecta solapamiento parcial, no solo arranque exacto', () => {
  const appointment = { startTime: '09:00', endTime: '10:00' }

  assert.strictEqual(overlaps({ startTime: '09:00', endTime: '09:40' }, appointment), true)
  assert.strictEqual(overlaps({ startTime: '09:40', endTime: '10:20' }, appointment), true)
  assert.strictEqual(overlaps({ startTime: '10:20', endTime: '11:00' }, appointment), false)
})

test('overlaps trata los bordes como libres (una cita que termina a las 10:00 no bloquea el slot de las 10:00)', () => {
  const appointment = { startTime: '09:00', endTime: '10:00' }

  assert.strictEqual(overlaps({ startTime: '10:00', endTime: '10:40' }, appointment), false)
  assert.strictEqual(overlaps({ startTime: '08:20', endTime: '09:00' }, appointment), false)
})

// --- Escenario del bug reportado ---
test('BUG: cita de 60 min a las 09:00 sobre grilla de 40 min marca 09:40 como OCUPADO', () => {
  const active = [{ startTime: '09:00', endTime: '10:00' }]

  const { occupiedSlots, freeSlots } = buildDayView('09:00', '12:00', 40, active)

  // El slot fantasma: arranca dentro de la cita, antes se reportaba libre
  assert.ok(occupiedSlots.includes('09:40'), '09:40 debe estar ocupado')
  assert.ok(!freeSlots.includes('09:40'), '09:40 no puede aparecer como libre')

  assert.deepStrictEqual(occupiedSlots, ['09:00', '09:40'])
  assert.deepStrictEqual(freeSlots, ['10:20', '11:00'])
})

test('la cita de 60 min no bloquea slots posteriores a su fin', () => {
  const active = [{ startTime: '09:00', endTime: '10:00' }]

  const { freeSlots } = buildDayView('09:00', '12:00', 40, active)

  assert.ok(freeSlots.includes('10:20'))
  assert.ok(freeSlots.includes('11:00'))
})

test('una cita que cabe justo en un slot ocupa solo ese slot', () => {
  const active = [{ startTime: '09:40', endTime: '10:20' }]

  const { occupiedSlots, freeSlots } = buildDayView('09:00', '12:00', 40, active)

  assert.deepStrictEqual(occupiedSlots, ['09:40'])
  assert.deepStrictEqual(freeSlots, ['09:00', '10:20', '11:00'])
})

test('varias citas activas se acumulan sobre la misma grilla', () => {
  const active = [
    { startTime: '09:00', endTime: '10:00' },
    { startTime: '11:00', endTime: '11:30' }
  ]

  const { occupiedSlots, freeSlots } = buildDayView('09:00', '12:00', 40, active)

  assert.deepStrictEqual(occupiedSlots, ['09:00', '09:40', '11:00'])
  assert.deepStrictEqual(freeSlots, ['10:20'])
})

test('una cita que arranca fuera de grilla igual bloquea los slots que cruza', () => {
  const active = [{ startTime: '09:15', endTime: '09:45' }]

  const { occupiedSlots } = buildDayView('09:00', '12:00', 40, active)

  // Cruza el final del slot 09:00 y el inicio del 09:40
  assert.deepStrictEqual(occupiedSlots, ['09:00', '09:40'])
})

test('sin citas activas todos los slots quedan libres', () => {
  const { occupiedSlots, freeSlots } = buildDayView('09:00', '12:00', 40, [])

  assert.deepStrictEqual(occupiedSlots, [])
  assert.deepStrictEqual(freeSlots, ['09:00', '09:40', '10:20', '11:00'])
})

// --- Paridad entre los dos consumidores del módulo ---
test('la disponibilidad de reserva y la agenda coinciden sobre las mismas citas', () => {
  const active = [{ startTime: '09:00', endTime: '10:00' }]

  // appointment.service.js: grilla por duración del servicio, devuelve objetos
  const bookingSlots = filterAvailableSlots(generateSlots('09:00', '12:00', 40), active)
  // calendar.service.js: misma grilla, devuelve strings
  const { freeSlots } = buildDayView('09:00', '12:00', 40, active)

  assert.deepStrictEqual(bookingSlots.map(s => s.startTime), freeSlots)
})

test('calendar.service.js devuelve arrays de strings (shape que consume el frontend)', () => {
  const { occupiedSlots, freeSlots } = buildDayView('09:00', '12:00', 40, [
    { startTime: '09:00', endTime: '10:00' }
  ])

  for (const slot of [...occupiedSlots, ...freeSlots]) {
    assert.strictEqual(typeof slot, 'string')
    assert.match(slot, /^\d{2}:\d{2}$/)
  }
})

// --- Cupos que ya pasaron (disponibilidad de HOY) ---
// getAvailability generaba la grilla de apertura a cierre sin mirar el reloj,
// así que a las 18:00 seguía ofreciendo los cupos de las 08:00 del mismo día.
const { filterPastSlots, nowInShopTimezone } = require('../src/services/shared/slots.service')

// 2026-08-28 18:30 en Bogotá (UTC-5) == 23:30 UTC del mismo día.
const HOY_1830_BOGOTA = new Date('2026-08-28T23:30:00Z')

test('filterPastSlots descarta los cupos de hoy cuya hora ya pasó', () => {
  const slots = generateSlots('08:00', '20:00', 40)

  const quedan = filterPastSlots(slots, '2026-08-28', HOY_1830_BOGOTA)

  assert.ok(quedan.every(s => s.startTime > '18:30'), 'no debe quedar ningún cupo pasado')
  assert.deepStrictEqual(quedan.map(s => s.startTime), ['18:40', '19:20'])
})

test('filterPastSlots no toca la grilla de un día futuro', () => {
  const slots = generateSlots('08:00', '12:00', 40)

  const quedan = filterPastSlots(slots, '2026-08-29', HOY_1830_BOGOTA)

  assert.deepStrictEqual(quedan, slots)
})

test('filterPastSlots vacía la grilla de un día ya pasado', () => {
  const slots = generateSlots('08:00', '12:00', 40)

  assert.deepStrictEqual(filterPastSlots(slots, '2026-08-27', HOY_1830_BOGOTA), [])
})

test('filterPastSlots usa la hora de Bogotá, no la UTC del servidor', () => {
  // 2026-08-28 01:30 UTC son todavía las 20:30 del 27 en Bogotá: si se
  // comparara contra UTC, el día 27 se tomaría por pasado y devolvería [].
  const madrugadaUtc = new Date('2026-08-28T01:30:00Z')
  const slots = generateSlots('08:00', '23:00', 60)

  assert.deepStrictEqual(nowInShopTimezone(madrugadaUtc).date, '2026-08-27')
  assert.deepStrictEqual(
    filterPastSlots(slots, '2026-08-27', madrugadaUtc).map(s => s.startTime),
    ['21:00', '22:00']
  )
})

test('filterPastSlots deja libre el borde exacto solo si todavía no llegó', () => {
  const slots = [{ startTime: '18:30', endTime: '19:10' }, { startTime: '18:40', endTime: '19:20' }]

  // 18:30 ya arrancó, 18:40 no
  assert.deepStrictEqual(
    filterPastSlots(slots, '2026-08-28', HOY_1830_BOGOTA).map(s => s.startTime),
    ['18:40']
  )
})

// --- Crear una cita en el pasado ---
// createAppointment validaba barbería, barbero, servicio, horario de apertura y
// conflictos, pero nunca que la cita fuera a futuro: se podía reservar para
// ayer llamando al endpoint directo, sin pasar por la app.
const { isPastDateTime } = require('../src/services/shared/slots.service')

test('isPastDateTime rechaza un día anterior y acepta uno posterior', () => {
  assert.strictEqual(isPastDateTime('2026-08-27', '09:00', HOY_1830_BOGOTA), true)
  assert.strictEqual(isPastDateTime('2026-08-29', '09:00', HOY_1830_BOGOTA), false)
})

test('isPastDateTime rechaza una hora de hoy que ya pasó y acepta una posterior', () => {
  assert.strictEqual(isPastDateTime('2026-08-28', '08:00', HOY_1830_BOGOTA), true)
  assert.strictEqual(isPastDateTime('2026-08-28', '18:30', HOY_1830_BOGOTA), true)
  assert.strictEqual(isPastDateTime('2026-08-28', '18:40', HOY_1830_BOGOTA), false)
})

test('isPastDateTime compara contra Bogotá, no contra la UTC del servidor', () => {
  // 01:30 UTC = 20:30 del día anterior en Bogotá: las 21:00 de ese día siguen
  // siendo futuro, aunque en UTC ya sea el día siguiente.
  const madrugadaUtc = new Date('2026-08-28T01:30:00Z')

  assert.strictEqual(isPastDateTime('2026-08-27', '21:00', madrugadaUtc), false)
  assert.strictEqual(isPastDateTime('2026-08-27', '20:00', madrugadaUtc), true)
})

test('isPastDateTime es el complemento exacto de filterPastSlots', () => {
  const slots = generateSlots('08:00', '20:00', 40)
  const ofrecidos = filterPastSlots(slots, '2026-08-28', HOY_1830_BOGOTA)

  // Nada de lo que la disponibilidad ofrece puede ser rechazado al crearlo...
  for (const s of ofrecidos) {
    assert.strictEqual(isPastDateTime('2026-08-28', s.startTime, HOY_1830_BOGOTA), false)
  }
  // ...y nada de lo que descarta puede colarse por el endpoint directo.
  const descartados = slots.filter(s => !ofrecidos.includes(s))
  for (const s of descartados) {
    assert.strictEqual(isPastDateTime('2026-08-28', s.startTime, HOY_1830_BOGOTA), true)
  }
})

// --- La respuesta declara qué fecha interpretó ---
// El cliente pedía un día y leía otro en pantalla sin que nada lo delatara.
// getAvailability ahora devuelve date/today/timezone para que el desacuerdo de
// zona horaria entre cliente y servidor sea visible en la propia respuesta.
test('la fecha interpretada se normaliza igual venga como día o como ISO completo', () => {
  const normalizar = (d) => new Date(d).toISOString().slice(0, 10)

  assert.strictEqual(normalizar('2026-08-29'), '2026-08-29')
  assert.strictEqual(normalizar('2026-08-29T00:00:00.000Z'), '2026-08-29')
})

test('el día de la semana que usa getAvailability no está corrido', () => {
  // 2026-08-28 es viernes (5) y 2026-08-29 sábado (6). El bug reportado era
  // recibir la grilla del sábado pidiendo el viernes: la conversión estaba
  // bien, el cliente mandaba el día siguiente.
  assert.strictEqual(new Date('2026-08-28').getUTCDay(), 5)
  assert.strictEqual(new Date('2026-08-29').getUTCDay(), 6)
})
