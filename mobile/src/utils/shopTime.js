// Espejo de backend/src/services/shared/slots.service.js: el backend decide qué
// día es "hoy" en la zona de la barbería, así que el cliente tiene que armar la
// fila de días con el mismo criterio. Cuando cada uno usaba su propio reloj, un
// teléfono en otra zona pedía un día y leía otro en pantalla.
export const SHOP_TIMEZONE = 'America/Bogota'

const pad = (n) => String(n).padStart(2, '0')

const deviceNow = (now) => ({
  date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
  time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
})

// { date: "YYYY-MM-DD", time: "HH:MM" } en la zona de la barbería.
export const shopNow = (now = new Date(), timeZone = SHOP_TIMEZONE) => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now)

    const get = (type) => parts.find(p => p.type === type).value
    const hour = get('hour') === '24' ? '00' : get('hour')

    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${hour}:${get('minute')}`,
    }
  } catch {
    // Hermes puede venir sin la base de zonas horarias. Caer a la hora del
    // dispositivo es peor que lo correcto, pero mucho mejor que romper la
    // pantalla de reservas entera.
    return deviceNow(now)
  }
}

// Aritmética sobre el día de calendario, sin pasar por UTC en el medio.
export const addDaysToKey = (dateKey, days) => {
  const [y, m, d] = dateKey.split('-').map(Number)
  const shifted = new Date(y, m - 1, d + days)
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`
}

// Los próximos `count` días de calendario desde `from`, como claves YYYY-MM-DD.
export const dayKeysFrom = (from, count) =>
  Array.from({ length: count }, (_, i) => addDaysToKey(from, i))
