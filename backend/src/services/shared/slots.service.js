// Fuente única de verdad para la generación y ocupación de slots.
// La consumen appointment.service.js (disponibilidad de reserva) y
// calendar.service.js (vista de agenda del barbero), para que ambos
// respondan lo mismo sobre qué horario está libre y cuál no.

// Genera slots de tiempo entre apertura y cierre con la duración indicada
// Ejemplo: openTime="08:00", closeTime="20:00", duration=30
// Resultado: [{ startTime: "08:00", endTime: "08:30" }, { startTime: "08:30", endTime: "09:00" }, ...]
const generateSlots = (openTime, closeTime, duration) => {
  const slots = []
  const [openH, openM] = openTime.split(':').map(Number)
  const [closeH, closeM] = closeTime.split(':').map(Number)

  let currentMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

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

    currentMinutes += duration
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

module.exports = {
  generateSlots,
  overlaps,
  isSlotFree,
  filterAvailableSlots,
  filterPastSlots,
  nowInShopTimezone,
  SHOP_TIMEZONE,
}
