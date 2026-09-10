const test = require('node:test')
const assert = require('node:assert')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const { getPeriodRange, buildDaily } = require('../src/services/earnings.service')

const iso = (d) => d.toISOString().slice(0, 10)

// --- El período se calcula en la zona de la barbería ---------------------

// Colombia es UTC-5. A las 21:00 del 9 en Villavicencio el servidor ya está en
// el 10 en UTC. Como Appointment.date se guarda como medianoche UTC del día de
// calendario, preguntar por "hoy" con el reloj del proceso pedía la fecha de
// mañana y devolvía cero, con la lista de abajo mostrando cortes reales.
test('"hoy" sigue siendo hoy después de las 19:00 en Colombia', () => {
  const nocheDelNueve = new Date('2026-09-10T02:00:00.000Z') // 21:00 del 9 en Bogotá
  const { start } = getPeriodRange('today', nocheDelNueve)
  assert.equal(iso(start), '2026-09-09')
})

test('"hoy" abarca el día civil completo de la barbería', () => {
  const mediodia = new Date('2026-09-09T17:00:00.000Z') // 12:00 en Bogotá
  const { start, end } = getPeriodRange('today', mediodia)
  assert.equal(start.toISOString(), '2026-09-09T00:00:00.000Z')
  assert.equal(end.toISOString(), '2026-09-09T23:59:59.999Z')
})

test('una cita de hoy cae dentro del rango de hoy', () => {
  const ahora = new Date('2026-09-10T02:00:00.000Z')
  const { start, end } = getPeriodRange('today', ahora)
  const citaDeHoy = new Date('2026-09-09T00:00:00.000Z') // como la guarda Prisma
  assert.ok(citaDeHoy >= start && citaDeHoy <= end)
})

test('la semana va de lunes al día en curso', () => {
  // 2026-09-09 es miércoles.
  const miercoles = new Date('2026-09-09T17:00:00.000Z')
  const { start, end } = getPeriodRange('week', miercoles)
  assert.equal(iso(start), '2026-09-07', 'arranca el lunes')
  assert.equal(iso(end), '2026-09-09', 'llega hasta hoy inclusive')
})

test('el domingo pertenece a la semana que arrancó el lunes anterior', () => {
  // 2026-09-13 es domingo.
  const domingo = new Date('2026-09-13T17:00:00.000Z')
  const { start } = getPeriodRange('week', domingo)
  assert.equal(iso(start), '2026-09-07')
})

test('el mes arranca el día 1 del mes civil de la barbería', () => {
  const { start, end } = getPeriodRange('month', new Date('2026-09-09T17:00:00.000Z'))
  assert.equal(iso(start), '2026-09-01')
  assert.equal(iso(end), '2026-09-09')
})

test('sin período se usa el mes', () => {
  const conMes = getPeriodRange('month', new Date('2026-09-09T17:00:00.000Z'))
  const sinNada = getPeriodRange(undefined, new Date('2026-09-09T17:00:00.000Z'))
  assert.equal(iso(sinNada.start), iso(conMes.start))
})

// --- La gráfica cuadra con el total --------------------------------------

const cita = (fecha, hora, precio) => ({
  date: new Date(`${fecha}T00:00:00.000Z`),
  startTime: hora,
  totalPrice: precio,
})

test('las barras de la semana suman exactamente el total del período', () => {
  const ahora = new Date('2026-09-09T17:00:00.000Z')
  const range = getPeriodRange('week', ahora)
  const citas = [
    cita('2026-09-07', '09:00', 30000),
    cita('2026-09-08', '10:00', 20000),
    cita('2026-09-09', '11:00', 50000),
  ]

  const serie = buildDaily(citas, 'week', 40, 60, range)
  const sumaBarras = serie.reduce((s, d) => s + d.barberEarnings, 0)
  const totalEsperado = 100000 * 0.6

  assert.equal(Math.round(sumaBarras), Math.round(totalEsperado))
})

test('las barras del mes suman exactamente el total del período', () => {
  const ahora = new Date('2026-09-09T17:00:00.000Z')
  const range = getPeriodRange('month', ahora)
  const citas = [cita('2026-09-01', '09:00', 25000), cita('2026-09-09', '15:00', 75000)]

  const serie = buildDaily(citas, 'month', 40, 60, range)
  assert.equal(serie.length, 9, 'un tramo por día civil del período')
  assert.equal(Math.round(serie.reduce((s, d) => s + d.barberEarnings, 0)), 60000)
})

test('la serie cubre el rango completo, sin días de más ni de menos', () => {
  const range = getPeriodRange('week', new Date('2026-09-09T17:00:00.000Z'))
  const serie = buildDaily([], 'week', 40, 60, range)
  assert.equal(serie.length, 3, 'lunes, martes y miércoles')
  assert.equal(serie[0].date, '2026-09-07')
  assert.equal(serie[serie.length - 1].date, '2026-09-09')
})

test('un día sin citas vale cero, no un número inventado', () => {
  const range = getPeriodRange('week', new Date('2026-09-09T17:00:00.000Z'))
  const serie = buildDaily([cita('2026-09-09', '11:00', 50000)], 'week', 40, 60, range)
  const lunes = serie.find(d => d.date === '2026-09-07')
  assert.equal(lunes.total, 0)
  assert.equal(lunes.barberEarnings, 0)
})

test('la vista de hoy reparte por hora de inicio y suma el total', () => {
  const range = getPeriodRange('today', new Date('2026-09-09T17:00:00.000Z'))
  const serie = buildDaily(
    [cita('2026-09-09', '09:30', 40000), cita('2026-09-09', '15:00', 60000)],
    'today', 40, 60, range
  )
  assert.equal(serie.length, 24)
  assert.equal(serie[9].total, 40000)
  assert.equal(serie[15].total, 60000)
  assert.equal(serie.reduce((s, d) => s + d.total, 0), 100000)
})

// --- Nada de datos de relleno --------------------------------------------

const SERVICE_SRC = readFileSync(join(__dirname, '../src/services/earnings.service.js'), 'utf8')
const WEB_SRC = readFileSync(join(__dirname, '../../web/src/pages/barber/Earnings.jsx'), 'utf8')

// Los comentarios explican por qué se quitó el relleno y nombran Math.random.
// Lo que importa es que no quede en el código que se ejecuta.
const sinComentarios = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

test('el panel de ganancias no inventa datos', () => {
  assert.ok(
    !/Math\.random/.test(sinComentarios(WEB_SRC)),
    'la gráfica ya no se rellena con números al azar'
  )
  assert.ok(!/Math\.random/.test(sinComentarios(SERVICE_SRC)))
})

test('el panel lee los nombres que el backend manda de verdad', () => {
  for (const campo of ['totalEarned', 'cutsCount', 'successRate', 'barberPercentage', 'daily']) {
    assert.ok(WEB_SRC.includes(campo), `el panel debería leer ${campo}`)
  }
  // Nombres que nunca existieron en la respuesta.
  assert.ok(!/earnings\.total\b/.test(WEB_SRC), 'earnings.total no existe')
  assert.ok(!/earnings\.cuts\b/.test(WEB_SRC), 'earnings.cuts no existe')
})

// --- El dinero sale solo de citas COMPLETED de ese barbero ---------------

test('el total y el desglose consultan solo COMPLETED', () => {
  const fn = SERVICE_SRC.slice(
    SERVICE_SRC.indexOf('const getBarberEarnings'),
    SERVICE_SRC.indexOf('// Ganancias totales de una barbería')
  )
  const consultaCitas = fn.slice(fn.indexOf('prisma.appointment.findMany'))
  assert.ok(/status:\s*'COMPLETED'/.test(consultaCitas), 'filtra por COMPLETED')
  assert.ok(/barberId,/.test(consultaCitas), 'filtra por el barbero')
})

test('la tasa de éxito mide solo citas ya resueltas y excluye EXPIRED', () => {
  const fn = SERVICE_SRC.slice(
    SERVICE_SRC.indexOf('const getBarberEarnings'),
    SERVICE_SRC.indexOf('// Ganancias totales de una barbería')
  )
  const resueltas = fn.match(/const RESUELTAS = \[([^\]]+)\]/)
  assert.ok(resueltas, 'no se encontró la lista de estados resueltos')
  assert.ok(resueltas[1].includes("'COMPLETED'"))
  assert.ok(resueltas[1].includes("'NO_SHOW'"))
  assert.ok(resueltas[1].includes("'CANCELLED'"))
  // EXPIRED es neutro: no culpa a nadie, así que no baja la tasa del barbero.
  assert.ok(!resueltas[1].includes("'EXPIRED'"), 'EXPIRED no debe contar en contra')
  // Las citas abiertas tampoco: todavía no son un éxito ni un fracaso.
  assert.ok(!resueltas[1].includes("'PENDING'"))
  assert.ok(!resueltas[1].includes("'CONFIRMED'"))
})
