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
