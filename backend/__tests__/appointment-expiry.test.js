const test = require('node:test')
const assert = require('node:assert')

const {
  isAppointmentExpired,
  appointmentEndInstant,
  EXPIRY_GRACE_HOURS,
} = require('../src/services/appointment.service')

// Una cita del 9 de septiembre que termina 09:30 hora de la barbería.
// date se guarda como medianoche UTC; endTime es hora de pared en Bogotá.
const cita = (status, endTime = '09:30', fecha = '2026-09-09') => ({
  id: `appt-${status}-${endTime}`,
  date: new Date(`${fecha}T00:00:00.000Z`),
  endTime,
  status,
})

// --- Zona horaria: la trampa principal -----------------------------------

// Colombia es UTC-5. Las 09:30 de Bogotá son las 14:30 UTC. Calcular el
// vencimiento en UTC vencería las citas cinco horas antes de tiempo.
test('el fin de la cita se calcula en la zona de la barbería, no en UTC', () => {
  const fin = appointmentEndInstant(cita('CONFIRMED', '09:30'))
  assert.equal(fin.toISOString(), '2026-09-09T14:30:00.000Z')
})

test('una cita NO vence a las dos horas de su hora leída como UTC', () => {
  // 09:30 UTC + 2h = 11:30 UTC. En hora de la barbería son las 06:30: la cita
  // ni siquiera empezó. Leer en UTC la habría vencido acá.
  const ahora = new Date('2026-09-09T11:30:00.000Z')
  assert.ok(!isAppointmentExpired(cita('CONFIRMED', '09:30'), ahora))
})

// --- Gracia de 2 horas: PENDING y CONFIRMED ------------------------------

test('PENDING y CONFIRMED vencen dos horas después de terminar', () => {
  // Fin real: 14:30 UTC. Vence pasadas las 16:30 UTC.
  const antes = new Date('2026-09-09T16:29:00.000Z')
  const despues = new Date('2026-09-09T16:31:00.000Z')

  for (const status of ['PENDING', 'CONFIRMED']) {
    assert.ok(!isAppointmentExpired(cita(status), antes), `${status} no vence antes de la gracia`)
    assert.ok(isAppointmentExpired(cita(status), despues), `${status} vence pasada la gracia`)
  }
})

test('el borde exacto de la gracia todavía no vence', () => {
  const justo = new Date('2026-09-09T16:30:00.000Z')
  assert.ok(!isAppointmentExpired(cita('CONFIRMED'), justo))
})

test('una cita que acaba de terminar no vence', () => {
  const reciEnTerminada = new Date('2026-09-09T14:31:00.000Z')
  assert.ok(!isAppointmentExpired(cita('CONFIRMED'), reciEnTerminada))
})

// --- Gracia de 12 horas: IN_PROGRESS -------------------------------------

test('IN_PROGRESS no se vence a mitad del corte', () => {
  // Dos horas después de terminar el barbero puede seguir cortando.
  const dosHorasDespues = new Date('2026-09-09T16:31:00.000Z')
  assert.ok(!isAppointmentExpired(cita('IN_PROGRESS'), dosHorasDespues))
})

test('una IN_PROGRESS abandonada desde ayer sí vence', () => {
  // Fin real 14:30 UTC + 12h = 02:30 UTC del día siguiente.
  const antes = new Date('2026-09-10T02:29:00.000Z')
  const despues = new Date('2026-09-10T02:31:00.000Z')
  assert.ok(!isAppointmentExpired(cita('IN_PROGRESS'), antes))
  assert.ok(isAppointmentExpired(cita('IN_PROGRESS'), despues))
})

test('las gracias son las decididas: 2 horas y 12 horas', () => {
  assert.equal(EXPIRY_GRACE_HOURS.PENDING, 2)
  assert.equal(EXPIRY_GRACE_HOURS.CONFIRMED, 2)
  assert.equal(EXPIRY_GRACE_HOURS.IN_PROGRESS, 12)
})

// --- Estados que el barrido no toca --------------------------------------

test('el barrido no toca estados ya cerrados', () => {
  const muyDespues = new Date('2026-12-31T23:59:00.000Z')
  for (const status of ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED']) {
    assert.ok(
      !isAppointmentExpired(cita(status), muyDespues),
      `${status} no se vuelve a vencer`
    )
  }
})

test('una cita futura nunca vence', () => {
  const ahora = new Date('2026-09-09T18:00:00.000Z')
  assert.ok(!isAppointmentExpired(cita('CONFIRMED', '09:30', '2026-09-20'), ahora))
})

test('sin endTime no se vence nada', () => {
  const ahora = new Date('2026-12-31T23:59:00.000Z')
  assert.ok(!isAppointmentExpired({ ...cita('CONFIRMED'), endTime: null }, ahora))
})

// --- Las guardas que sostienen la regla de negocio ------------------------

// Marcar EXPIRED le quitaría el botón al barbero si estas listas no lo
// aceptaran: la regla que el estado busca sostener quedaría rota por su
// propia implementación.
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

test('completeAppointment y noShowAppointment aceptan EXPIRED como estado de partida', () => {
  const fuente = readFileSync(join(__dirname, '../src/services/appointment.service.js'), 'utf8')

  const complete = fuente.match(/if \(!\[([^\]]+)\]\.includes\(appointment\.status\)\) \{\s*\n\s*throw new Error\('Solo se pueden completar/)
  assert.ok(complete, 'no se encontró la guarda de completeAppointment')
  assert.ok(complete[1].includes("'EXPIRED'"), 'completeAppointment rechaza las vencidas')

  const noShow = fuente.match(/if \(!\[([^\]]+)\]\.includes\(appointment\.status\)\) \{\s*\n\s*throw new Error\('Solo se pueden marcar como no-show/)
  assert.ok(noShow, 'no se encontró la guarda de noShowAppointment')
  assert.ok(noShow[1].includes("'EXPIRED'"), 'noShowAppointment rechaza las vencidas')
})

test('EXPIRED existe en el enum del esquema', () => {
  const schema = readFileSync(join(__dirname, '../prisma/schema.prisma'), 'utf8')
  const enumBlock = schema.match(/enum AppointmentStatus \{([\s\S]*?)\n\}/)
  assert.ok(enumBlock, 'no se encontró el enum AppointmentStatus')
  assert.ok(/^\s*EXPIRED\s*$/m.test(enumBlock[1]), 'falta EXPIRED en el enum')
})
