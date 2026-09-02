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
  // calendar.service pasa gridMinutes = null: grilla encadenada.
  const allSlots = generateSlots(openTime, closeTime, slotDuration, null)
  return {
    occupiedSlots: allSlots.filter(s => !isSlotFree(s, activeAppointments)).map(s => s.startTime),
    freeSlots: allSlots.filter(s => isSlotFree(s, activeAppointments)).map(s => s.startTime)
  }
}

test('generateSlots en modo encadenado mantiene la grilla de 40 min', () => {
  // gridMinutes = null es lo que usa la agenda del barbero.
  const slots = generateSlots('09:00', '12:00', 40, null)

  assert.deepStrictEqual(slots, [
    { startTime: '09:00', endTime: '09:40' },
    { startTime: '09:40', endTime: '10:20' },
    { startTime: '10:20', endTime: '11:00' },
    { startTime: '11:00', endTime: '11:40' }
  ])
})

test('generateSlots no emite un slot que se pase de la hora de cierre', () => {
  const slots = generateSlots('09:00', '10:00', 40, null)

  // 09:40 + 40 = 10:20 > 10:00, así que solo entra el primero
  assert.deepStrictEqual(slots, [{ startTime: '09:00', endTime: '09:40' }])
})

test('la grilla de reserva cae en :00, :15, :30 y :45', () => {
  const slots = generateSlots('09:00', '11:00', 48)

  assert.deepStrictEqual(slots.map(s => s.startTime), [
    '09:00', '09:15', '09:30', '09:45', '10:00'
  ])
  // Ningún cupo arranca fuera de un cuarto de hora.
  assert.ok(slots.every(s => [0, 15, 30, 45].includes(Number(s.startTime.split(':')[1]))))
})

test('un servicio de 48 min ya no produce horas como 16:48', () => {
  const inicios = generateSlots('09:00', '19:00', 48).map(s => s.startTime)

  assert.ok(!inicios.includes('09:48'))
  assert.ok(!inicios.includes('16:48'))
  assert.ok(inicios.includes('16:45'))
})

test('solo se ofrece el cupo si el servicio COMPLETO cabe antes del cierre', () => {
  // 09:15 + 48 = 10:03, pasado el cierre: no debe ofrecerse.
  const slots = generateSlots('09:00', '10:00', 48)

  assert.deepStrictEqual(slots, [{ startTime: '09:00', endTime: '09:48' }])
})

test('si la barbería abre fuera de un cuarto, el primer cupo es el siguiente cuarto', () => {
  const slots = generateSlots('09:10', '11:00', 30)

  assert.strictEqual(slots[0].startTime, '09:15')
})

test('los cupos de la grilla se solapan entre sí y una cita tomada limpia los vecinos', () => {
  const slots = generateSlots('09:00', '12:00', 48)
  // Se ofrecen candidatos solapados: 09:00, 09:15, 09:30...
  assert.ok(slots.length > 3)

  const tomada = [{ startTime: '09:00', endTime: '09:48' }]
  const libres = filterAvailableSlots(slots, tomada).map(s => s.startTime)

  // Todo lo que choca con 09:00–09:48 desaparece; 10:00 sobrevive.
  assert.ok(!libres.includes('09:00'))
  assert.ok(!libres.includes('09:15'))
  assert.ok(!libres.includes('09:30'))
  assert.ok(!libres.includes('09:45'))
  assert.ok(libres.includes('10:00'))
})

test('la capacidad real del día baja de 12 a 10 citas de 48 min', () => {
  // El número que se usó para decidir el cambio: reservar siempre el primer
  // cupo libre, como haría una fila de clientes, en el horario del seed.
  const contarCitas = (grid) => {
    const tomadas = []
    let libres = filterAvailableSlots(generateSlots('09:00', '19:00', 48, grid), tomadas)
    while (libres.length) {
      tomadas.push(libres[0])
      libres = filterAvailableSlots(generateSlots('09:00', '19:00', 48, grid), tomadas)
    }
    return tomadas.length
  }

  assert.strictEqual(contarCitas(null), 12)  // encadenada, como estaba
  assert.strictEqual(contarCitas(15), 10)    // grilla de cuartos
})

test('un servicio de 15 min no pierde capacidad con la grilla de cuartos', () => {
  // Es la razón de elegir cuartos y no medias horas: con :00/:30 este
  // servicio caía de 40 cupos a 20.
  assert.strictEqual(generateSlots('09:00', '19:00', 15).length, 40)
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
test('reserva y agenda nunca se contradicen sobre una cita tomada', () => {
  // Las dos vistas ya NO producen la misma lista: reserva usa la grilla de
  // cuartos y la agenda la encadenada, a propósito. Lo que sí tiene que
  // seguir valiendo es que no se contradigan — que reserva jamás ofrezca un
  // horario que pise una cita que la agenda da por ocupada.
  const active = [{ startTime: '09:00', endTime: '10:00' }]

  const bookingSlots = filterAvailableSlots(generateSlots('09:00', '12:00', 40), active)
  const { occupiedSlots, freeSlots } = buildDayView('09:00', '12:00', 40, active)

  // Ningún cupo ofrecido se solapa con la cita activa.
  assert.ok(bookingSlots.every(s => isSlotFree(s, active)))
  // Y ninguno arranca dentro de la franja que la agenda marca ocupada.
  assert.ok(bookingSlots.every(s => !(s.startTime >= '09:00' && s.startTime < '10:00')))
  // La agenda sigue reportando esa franja como ocupada y no como libre.
  assert.ok(occupiedSlots.includes('09:00'))
  assert.ok(!freeSlots.includes('09:00'))
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
  // Cuartos: 19:30 + 40 = 20:10, pasado el cierre, así que no entra.
  assert.deepStrictEqual(quedan.map(s => s.startTime), ['18:45', '19:00', '19:15'])
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
    ['20:45', '21:00', '21:15', '21:30', '21:45', '22:00']
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
