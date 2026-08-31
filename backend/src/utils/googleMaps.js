// Extrae lat/lng del link de Google Maps que pega el dueño de la barbería.
//
// El caso real es que el dueño abre Maps en el celular, toca "Compartir" y
// pega algo como https://maps.app.goo.gl/AbCdEf123. Ese link NO trae las
// coordenadas: son un identificador corto que hay que resolver siguiendo el
// redirect. Por eso esto vive en el backend y no en el navegador — además de
// que fetch desde el front chocaría con CORS.
//
// Seguir un redirect que viene del usuario es una puerta a SSRF: si aceptamos
// cualquier host, el servidor termina haciendo peticiones a donde diga quien
// pegue el link (169.254.169.254, localhost, la red interna). Por eso cada
// salto se valida contra la lista de hosts de Google, incluido el destino
// final del redirect, no solo la URL original.

// Colombia continental + insular. Punta Gallinas al norte (13.39), Amazonas al
// sur (-4.23), Malpelo al occidente (-81.73) y Guainía al oriente (-66.85).
// Se redondea hacia afuera para no rechazar un punto legítimo en el borde.
const COLOMBIA_BOUNDS = { minLat: -4.3, maxLat: 13.6, minLng: -82.0, maxLng: -66.8 }

const isInColombia = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat >= COLOMBIA_BOUNDS.minLat && lat <= COLOMBIA_BOUNDS.maxLat &&
  lng >= COLOMBIA_BOUNDS.minLng && lng <= COLOMBIA_BOUNDS.maxLng

// Hosts permitidos. Se le quitan los prefijos `www.` y `maps.` y lo que queda
// tiene que ser un dominio de Google: goo.gl / app.goo.gl para los links
// cortos, o google.<tld> para los largos (google.com, google.com.co, etc).
const isGoogleHost = (hostname) => {
  const host = String(hostname).toLowerCase().replace(/^www\./, '').replace(/^maps\./, '')
  return host === 'goo.gl' || host === 'app.goo.gl' || /^google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)
}

const parseUrl = (value) => {
  try {
    const url = new URL(String(value).trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url
  } catch {
    return null
  }
}

const isGoogleMapsUrl = (value) => {
  const url = parseUrl(value)
  return !!url && isGoogleHost(url.hostname)
}

// Un link corto no contiene coordenadas, solo un id que hay que resolver.
const isShortLink = (value) => {
  const url = parseUrl(value)
  if (!url) return false
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  return host === 'goo.gl' || host === 'maps.app.goo.gl' || host === 'app.goo.gl'
}

const toPair = (rawLat, rawLng) => {
  const lat = parseFloat(rawLat)
  const lng = parseFloat(rawLng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  // Fuera del rango del planeta: es basura, no un punto en otro país.
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { latitude: lat, longitude: lng }
}

// Extrae coordenadas de un texto (URL ya resuelta, o un "4.6097, -74.0817"
// pegado a mano). No hace red: es puro parseo.
//
// El orden importa. `!3d/!4d` es la posición del LOCAL; `@lat,lng` es hacia
// dónde apunta la cámara del mapa. Cuando el link trae los dos pueden diferir
// varias cuadras, y el que queremos es el del local.
const extractCoordinates = (value) => {
  if (!value) return null
  const text = String(value).trim()

  // 1. Marcador del lugar: .../data=...!8m2!3d4.6097!4d-74.0817
  const marker = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (marker) {
    const pair = toPair(marker[1], marker[2])
    if (pair) return pair
  }

  // 2. Centro de la cámara: /maps/@4.6097,-74.0817,17z
  const camera = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (camera) {
    const pair = toPair(camera[1], camera[2])
    if (pair) return pair
  }

  // 3. Parámetros de consulta: ?q=, ?query=, ?ll=, ?center=, ?daddr=
  const url = parseUrl(text)
  if (url) {
    for (const key of ['q', 'query', 'll', 'center', 'daddr', 'destination']) {
      const raw = url.searchParams.get(key)
      if (!raw) continue
      const match = raw.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
      if (match) {
        const pair = toPair(match[1], match[2])
        if (pair) return pair
      }
    }
  }

  // 4. Pegado a mano, sin link: "4.6097, -74.0817"
  const bare = text.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/)
  if (bare) return toPair(bare[1], bare[2])

  return null
}

// Sigue los redirects de un link corto validando el host en CADA salto. Sin
// esa validación por salto, un redirect desde un host de Google hacia otro
// arbitrario convertiría al servidor en proxy de quien pegue el link.
const MAX_REDIRECTS = 5
const FETCH_TIMEOUT_MS = 5000

const resolveShortLink = async (value, fetchImpl = fetch) => {
  let current = value
  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const url = parseUrl(current)
    if (!url || !isGoogleHost(url.hostname)) return null

    let response
    try {
      response = await fetchImpl(url.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EstiloApp/1.0)' },
      })
    } catch {
      return null
    }

    const location = response.headers?.get?.('location')
    if (!location) {
      // Sin redirect: el destino final es esta misma URL.
      return url.toString()
    }
    // El header puede venir relativo — se resuelve contra la URL actual y el
    // host resultante se vuelve a validar en la siguiente vuelta del bucle.
    current = new URL(location, url).toString()
  }
  return null
}

// Punto de entrada: recibe lo que pegó el dueño y devuelve { latitude, longitude }.
// Lanza Error con mensaje en español para que el controlador lo devuelva tal cual.
const LINK_MANUAL_HINT =
  'No pudimos leer ese link. Abrilo en el navegador y copiá el link de la barra de direcciones.'

const resolveMapLink = async (input, fetchImpl = fetch) => {
  const value = String(input || '').trim()
  if (!value) throw new Error('Pegá el link de Google Maps de tu local.')

  const url = parseUrl(value)

  // El host se valida ANTES de parsear. Si no, un link de cualquier dominio
  // que lleve "@4.6,-74.0" en la ruta pasaría solo porque el texto calza con
  // el patrón, sin haber sido nunca un link de Maps. Las coordenadas pegadas
  // a mano no son una URL y siguen de largo.
  if (url && !isGoogleHost(url.hostname)) {
    throw new Error('Ese link no es de Google Maps. Pegá el link que te da el botón Compartir de Maps.')
  }

  // Un link largo (o coordenadas pegadas a mano) se resuelve sin tocar la red.
  let coords = extractCoordinates(value)

  if (!coords) {
    if (!url) throw new Error(LINK_MANUAL_HINT)
    if (!isShortLink(value)) throw new Error(LINK_MANUAL_HINT)

    const resolved = await resolveShortLink(value, fetchImpl)
    if (!resolved) throw new Error(LINK_MANUAL_HINT)
    coords = extractCoordinates(resolved)
    if (!coords) throw new Error(LINK_MANUAL_HINT)
  }

  if (!isInColombia(coords.latitude, coords.longitude)) {
    throw new Error('Esa ubicación queda fuera de Colombia. Revisá que el link sea el de tu local.')
  }

  // Google entrega hasta 7 decimales; con 6 el error es de ~11 cm, de sobra
  // para ubicar una barbería y evita guardar ruido en la base.
  return {
    latitude: Math.round(coords.latitude * 1e6) / 1e6,
    longitude: Math.round(coords.longitude * 1e6) / 1e6,
  }
}

module.exports = {
  COLOMBIA_BOUNDS,
  isInColombia,
  isGoogleHost,
  isGoogleMapsUrl,
  isShortLink,
  extractCoordinates,
  resolveShortLink,
  resolveMapLink,
}
