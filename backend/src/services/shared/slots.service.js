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

module.exports = { generateSlots, overlaps, isSlotFree, filterAvailableSlots }
