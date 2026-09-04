const test = require('node:test')
const assert = require('node:assert')

const {
  buildConfirmationReply,
  claimsBookingHappened,
  UNBACKED_CLAIM_REPLY,
} = require('../src/services/chatbot.service')

// El texto de confirmación lo escribe el código a partir de la fila creada.
// Si el modelo alucinó la hora o el barbero, lo que el cliente lee sigue
// siendo lo que quedó en la base.
test('la confirmación se arma con los datos de la cita creada, no con los del modelo', () => {
  const appointment = {
    date: new Date('2026-09-04T00:00:00.000Z'),
    startTime: '15:30',
    barber: { user: { name: 'Juan García' } },
    service: { name: 'Corte clásico' },
  }

  const reply = buildConfirmationReply(appointment)

  assert.ok(reply.includes('Corte clásico'))
  assert.ok(reply.includes('Juan García'))
  assert.ok(reply.includes('2026-09-04'))
  assert.ok(reply.includes('15:30'))
  // El nombre del día lo calcula el código, no se deduce del YYYY-MM-DD.
  assert.ok(reply.includes('Viernes'))
})

test('la confirmación no rompe si faltan los include de barbero o servicio', () => {
  const reply = buildConfirmationReply({
    date: new Date('2026-09-04T00:00:00.000Z'),
    startTime: '09:00',
  })
  assert.ok(reply.includes('2026-09-04'))
  assert.ok(reply.includes('tu barbero'))
})

// --- Guardia anti-mentira ----------------------------------------------

test('detecta las formas en que el modelo afirma una reserva', () => {
  const afirmaciones = [
    '✅ ¡Cita reservada! Juan el viernes a las 3.',
    'Listo, ya te reservé tu cita para el viernes.',
    'Tu cita quedó confirmada para mañana a las 10:00.',
    'Perfecto, agendé tu cita con Juan.',
    'Tu cita para el viernes quedó lista.',
    '¡Nos vemos el viernes a las 3! 💈',
    'Te esperamos el sábado a las 10.',
  ]
  for (const texto of afirmaciones) {
    assert.ok(claimsBookingHappened(texto), `no detectó: ${texto}`)
  }
})

test('no marca como afirmación las respuestas que no reservaron nada', () => {
  const inocentes = [
    '¿Con cuál barbero preferís tu cita?',
    'Tenemos dos barberos llamados Juan: 1. Juan García 2. Juan Ramírez',
    'El corte clásico cuesta $25.000 COP y dura 30 minutos.',
    'Abrimos de lunes a sábado de 9:00 a 20:00.',
    'Para reservar tu cita necesito saber el día y la hora.',
    '¿Querés que te reserve una cita para el viernes?',
    'Esa fecha y hora ya pasaron. Decime un horario a futuro y te la reservo.',
    '',
    null,
  ]
  for (const texto of inocentes) {
    assert.ok(!claimsBookingHappened(texto), `falso positivo: ${texto}`)
  }
})

test('el reemplazo le dice al cliente que la cita NO quedó', () => {
  assert.ok(/NO quedó agendada/.test(UNBACKED_CLAIM_REPLY))
  // Y no puede disparar el guardia otra vez.
  assert.ok(!claimsBookingHappened(UNBACKED_CLAIM_REPLY))
})

test('la confirmación real del código pasa por su propio guardia', () => {
  // Coherencia: el texto que sí respalda una cita creada es, a propósito, uno
  // de los que el guardia reconoce como afirmación de reserva. Si algún día
  // deja de serlo, el guardia habría dejado de cubrir el caso principal.
  const reply = buildConfirmationReply({
    date: new Date('2026-09-04T00:00:00.000Z'),
    startTime: '15:30',
    barber: { user: { name: 'Juan García' } },
    service: { name: 'Corte clásico' },
  })
  assert.ok(claimsBookingHappened(reply))
})
