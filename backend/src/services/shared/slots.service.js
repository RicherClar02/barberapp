// Fuente única de verdad para la generación y ocupación de slots.
// La consumen appointment.service.js (disponibilidad de reserva) y
// calendar.service.js (vista de agenda del barbero), para que ambos
// respondan lo mismo sobre qué horario está libre y cuál no.

// Paso de la grilla de reserva: los cupos caen siempre en :00, :15, :30 y :45.
// Antes la grilla se encadenaba con la duración del servicio, así que un
// servicio de 48 min producía horas como 16:48 y 19:12: correcto pero feo de
// leer. Cuartos y no medias horas porque con media hora un servicio de 15 min
// perdía la mitad de la capacidad del día (40 cupos pasaban a 20); con cuartos
// no pierde ninguno, y para 48 min cuesta exactamente lo mismo.
const BOOKING_GRID_MINUTES = 15

// Genera los cupos que se le ofrecen al cliente entre apertura y cierre.
//
// `gridMinutes` es el paso de la grilla de pared:
//   - 15 (default) → cupos en :00/:15/:30/:45. Se emite uno por cada marca en
//     la que el servicio COMPLETO cabe antes del cierre. Los cupos se solapan
//     entre sí a propósito: son horarios candidatos, y filterAvailableSlots
//     descarta los que chocan con una cita ya tomada.
//   - null → modo encadenado (arranca en la apertura y avanza de a `duration`,
//     sin solaparse). Lo usa la agenda del barbero, donde la lista de cupos se
//     cuenta como capacidad del día y no como horarios ofrecibles.
//
// Ejemplo: openTime="09:00", closeTime="10:00", duration=48
// Resultado: [{ startTime: "09:00", endTime: "09:48" }] — 09:15 no entra
// porque terminaría 10:03, después del cierre.
const generateSlots = (openTime, closeTime, duration, gridMinutes = BOOKING_GRID_MINUTES) => {
  const slots = []
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)

  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM
  const paso = gridMinutes || duration

  // Con grilla, el primer cupo es la primera marca en la apertura o después
  // (una barbería que abre 09:10 empieza a ofrecer 09:15). Encadenado, arranca
  // exactamente en la apertura.
  let currentMinutes = gridMinutes
    ? Math.ceil(openMinutes / gridMinutes) * gridMinutes
    : openMinutes

  while (currentMinutes + duration <= closeMinutes) {
    const startH = String(Math.floor(currentMinutes / 60)).padStart(2, '0')
    const startM = String(currentMinutes % 60).padStart(2, '0')
    const endTotal = currentMinutes + duration
    const endH = String(Math.floor(endTotal / 60)).padStart(2, '0')
    const endM = String(endTotal % 60).padStart(2, '0')

    slots.push({
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`
    })

    currentMinutes += paso
  }

  return slots
}

// Dos intervalos se solapan si uno empieza antes de que el otro termine
// y termina después de que el otro empieza. Comparar solo startTime deja
// pasar citas largas: una cita 09:00-10:00 sobre grilla de 40 min ocupa
// también el slot 09:40, no únicamente el de las 09:00.
const overlaps = (slot, appointment) => {
  return slot.startTime < appointment.endTime && slot.endTime > appointment.startTime
}

// Un slot está libre si no se solapa con ninguna de las citas dadas
const isSlotFree = (slot, appointments) => {
  return !appointments.some(appointment => overlaps(slot, appointment))
}

// Filtra los slots que no chocan con ninguna cita activa
const filterAvailableSlots = (slots, appointments) => {
  return slots.filter(slot => isSlotFree(slot, appointments))
}

// Zona horaria de las barberías. Los openTime/closeTime del schedule son hora
// local de Colombia, pero el servidor corre en UTC: comparar contra la hora
// del proceso adelantaría 5 horas y escondería slots que todavía son válidos.
const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE || 'America/Bogota'

// "YYYY-MM-DD" y "HH:MM" de un instante, ya en la zona de la barbería.
const nowInShopTimezone = (now = new Date(), timeZone = SHOP_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)

  const get = type => parts.find(p => p.type === type).value
  // hourCycle h23 puede devolver "24" a medianoche en algunos runtimes.
  const hour = get('hour') === '24' ? '00' : get('hour')

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
  }
}

// Cuántos ms va por delante de UTC la zona de la barbería en ese instante.
// Colombia no tiene horario de verano, pero se calcula en vez de asumir -5
// para que apuntar SHOP_TIMEZONE a otra zona siga dando bien.
const shopUtcOffsetMs = (instant, timeZone = SHOP_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(instant)

  const get = type => Number(parts.find(p => p.type === type).value)
  const hour = get('hour') === 24 ? 0 : get('hour')
  // La hora local leída, interpretada como si fuera UTC. La diferencia contra
  // el instante real es el offset de la zona.
  const asIfUtc = Date.UTC(
    get('year'), get('month') - 1, get('day'),
    hour, get('minute'), get('second'), instant.getUTCMilliseconds()
  )
  return asIfUtc - instant.getTime()
}

// Un día de calendario (validFrom/validUntil de una oferta, date de una cita)
// se guarda como medianoche UTC. Para compararlo hay que usar el día de HOY en
// la zona de la barbería, también como medianoche UTC: así la comparación es
// día contra día y no instante contra instante, que es lo que corría la
// vigencia un día.
const shopTodayUtcMidnight = (now = new Date(), timeZone = SHOP_TIMEZONE) =>
  new Date(`${nowInShopTimezone(now, timeZone).date}T00:00:00.000Z`)

// Instante en que termina, en hora de la barbería, el día de calendario que
// representa `value`. "Vigente hasta el 30" vale todo el 30, no hasta su
// medianoche.
const endOfShopDay = (value, timeZone = SHOP_TIMEZONE) => {
  const [y, m, d] = new Date(value).toISOString().slice(0, 10).split('-').map(Number)
  const wallEnd = Date.UTC(y, m - 1, d, 23, 59, 59, 999)
  return new Date(wallEnd - shopUtcOffsetMs(new Date(wallEnd), timeZone))
}

// Descarta los slots cuya hora de inicio ya pasó, pero SOLO si la fecha pedida
// es hoy: para días futuros la grilla entera es válida, y para días pasados no
// queda ninguna. Antes no se filtraba nada, así que pedir la disponibilidad de
// hoy a las 18:00 devolvía igual los cupos de las 08:00.
const filterPastSlots = (slots, date, now = new Date(), timeZone = SHOP_TIMEZONE) => {
  const shopNow = nowInShopTimezone(now, timeZone)
  if (date > shopNow.date) return slots
  if (date < shopNow.date) return []
  return slots.filter(slot => slot.startTime > shopNow.time)
}

// ¿Ese día y esa hora ya pasaron? Es el complemento exacto del criterio de
// filterPastSlots — un cupo que la disponibilidad ya no ofrece tampoco debe
// poder crearse llamando al endpoint directo, sin pasar por la app.
const isPastDateTime = (date, startTime, now = new Date(), timeZone = SHOP_TIMEZONE) => {
  const shopNow = nowInShopTimezone(now, timeZone)
  if (date < shopNow.date) return true
  if (date > shopNow.date) return false
  return startTime <= shopNow.time
}

module.exports = {
  generateSlots,
  BOOKING_GRID_MINUTES,
  overlaps,
  isSlotFree,
  filterAvailableSlots,
  filterPastSlots,
  isPastDateTime,
  nowInShopTimezone,
  shopUtcOffsetMs,
  shopTodayUtcMidnight,
  endOfShopDay,
  SHOP_TIMEZONE,
}
