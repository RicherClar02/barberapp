// Smoke test completo con el seed demo cargado.
// Requiere: node scripts/seed-demo.js + servidor RECIÉN arrancado en
// http://localhost:3000.
//
// IMPORTANTE: el rate limiter de login permite 5 por IP cada 15 min y
// este script hace exactamente 5 logins. Si ya hiciste otros logins
// desde la misma IP en esa ventana, el 5º (CLIENT) dará 429. Reinicia
// el servidor antes de correrlo para resetear el contador en memoria.
//
// Uso: node scripts/smoke-test.js
require('dotenv').config()

const BASE = 'http://localhost:3000'
let passed = 0
let failed = 0
const check = (label, condition, detail = '') => {
  if (condition) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label} ${detail}`) }
}

const login = async (email, password) => {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const j = await r.json()
  return { status: r.status, token: j.token, user: j.user }
}

const get = async (path, token = null) => {
  const r = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  return { status: r.status, body: await r.json() }
}

const main = async () => {
  // ── 1. Login de cada rol ───────────────────────────────────────────
  console.log('\nSMOKE 1: login de cada rol')
  const admin = await login('admin@estilo.com', 'Admin123!')
  check('ADMIN inicia sesión', admin.status === 200 && admin.user?.role === 'ADMIN')
  const owner = await login('owner.imperial@estilo.com', 'Owner123!')
  check('OWNER inicia sesión', owner.status === 200 && owner.user?.role === 'OWNER')
  const ownerBog = await login('owner.bogota@estilo.com', 'Owner123!')
  check('OWNER (Bogotá) inicia sesión', ownerBog.status === 200)
  const barber = await login('barber.julian@estilo.com', 'Barber123!')
  check('BARBER inicia sesión', barber.status === 200 && barber.user?.role === 'BARBER')
  const client = await login('cliente1@estilo.test', 'Cliente123!')
  check('CLIENT inicia sesión', client.status === 200 && client.user?.role === 'CLIENT')

  // ── 2. Orden de barberías en Villavicencio ─────────────────────────
  console.log('\nSMOKE 2: GET /api/barbershops?city=Villavicencio → PREMIUM con anuncio → STANDARD → BASIC')
  const villavo = await get('/api/barbershops?city=Villavicencio')
  const names = (villavo.body.barbershops || []).map(b => b.name)
  console.log('  Orden recibido:', names.join(' → '))
  check('retorna exactamente las 3 de Villavicencio', names.length === 3 && !names.includes('Barbería Capital'))
  check('1º Barbería Imperial (PREMIUM + anuncio pagado)', names[0] === 'Barbería Imperial')
  check('2º La Navaja de Oro (STANDARD)', names[1] === 'La Navaja de Oro')
  check('3º Barbería Clásica del Llano (BASIC)', names[2] === 'Barbería Clásica del Llano')
  const imperial = villavo.body.barbershops?.[0]
  check('Imperial tiene hasActiveAd: true', imperial?.hasActiveAd === true)
  check('Imperial tiene avgRating 5', imperial?.avgRating === 5)

  // ── 3. Filtro de ciudad Bogotá ─────────────────────────────────────
  console.log('\nSMOKE 3: GET /api/barbershops?city=Bogotá → solo la de Bogotá')
  const bogota = await get(`/api/barbershops?city=${encodeURIComponent('Bogotá')}`)
  const bogNames = (bogota.body.barbershops || []).map(b => b.name)
  check('retorna solo Barbería Capital', bogNames.length === 1 && bogNames[0] === 'Barbería Capital', `(obtuvo: ${bogNames.join(',')})`)

  // ── 4. Completeness de ficha incompleta ────────────────────────────
  console.log('\nSMOKE 4: completeness de Barbería Capital (ficha incompleta)')
  const capitalId = bogota.body.barbershops?.[0]?.id
  const comp = await get(`/api/barbershops/${capitalId}/completeness`, ownerBog.token)
  console.log(`  Completitud: ${comp.body.percentage}% — falta: ${comp.body.missing?.join(', ')}`)
  check('responde 200 con porcentaje < 100', comp.status === 200 && comp.body.percentage < 100)
  check('detecta que faltan logo, portada, descripción y fotos',
    ['Logo', 'Foto de portada', 'Descripción', 'Mínimo 3 fotos'].every(m => comp.body.missing?.includes(m)),
    `(missing: ${comp.body.missing?.join(',')})`)

  // ── 5. Dashboard del owner con datos reales ────────────────────────
  console.log('\nSMOKE 5: endpoints del dashboard owner (Barbería Imperial)')
  const myShops = await get('/api/barbershops/my', owner.token)
  const myShop = myShops.body.barbershops?.[0]
  check('GET /api/barbershops/my retorna su barbería', myShops.status === 200 && myShop?.name === 'Barbería Imperial')
  check('incluye suscripción ACTIVE', myShop?.subscription?.status === 'ACTIVE')

  const overview = await get(`/api/analytics/shop/${myShop.id}/overview?period=today`, owner.token)
  check('GET analytics overview responde 200', overview.status === 200)

  const today = new Date().toISOString().slice(0, 10)
  const agenda = await get(`/api/appointments/shop/${myShop.id}?date=${today}`, owner.token)
  const todayAppts = agenda.body.appointments || []
  check('agenda de hoy tiene la cita CONFIRMED del seed', todayAppts.some(a => a.status === 'CONFIRMED'), `(citas hoy: ${todayAppts.length})`)

  // Guard de ownership: el owner de Bogotá NO puede ver analytics de Imperial
  const intruso = await get(`/api/analytics/shop/${myShop.id}/overview?period=today`, ownerBog.token)
  check('otro owner recibe 403 en analytics ajeno', intruso.status === 403)

  // ── 6. lowRating en el barbero con rating bajo ─────────────────────
  console.log('\nSMOKE 6: lowRating: true para Esteban Ruiz (2.0★ con 5 reseñas)')
  const navajaShop = villavo.body.barbershops.find(b => b.name === 'La Navaja de Oro')
  const barbers = await get(`/api/barbers/shop/${navajaShop.id}`)
  const esteban = (barbers.body.barbers || []).find(b => b.user?.name === 'Esteban Ruiz')
  check('Esteban tiene avgRating 2', esteban?.avgRating === 2, `(obtuvo: ${esteban?.avgRating})`)
  check('Esteban tiene lowRating: true', esteban?.lowRating === true)
  const otros = (barbers.body.barbers || []).filter(b => b.user?.name !== 'Esteban Ruiz')
  check('los demás barberos NO tienen lowRating', otros.every(b => b.lowRating === false))

  // ── 7. (Tarea 1) Persistencia de preferencias de notificación ──────
  console.log('\nSMOKE 7: toggles de preferencias persisten (claves del backend)')
  const putPrefs = await fetch(`${BASE}/api/notifications/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${client.token}` },
    body: JSON.stringify({ preferWhatsapp: true, preferPush: false, reminderEnabled: false }),
  })
  check('PUT preferencias responde 200', putPrefs.status === 200)
  const prefs1 = await get('/api/notifications/preferences', client.token)
  const p1 = prefs1.body.preferences
  check('GET refleja los cambios (preferWhatsapp:true, preferPush:false, reminderEnabled:false)',
    p1?.preferWhatsapp === true && p1?.preferPush === false && p1?.reminderEnabled === false,
    `(obtuvo: ${JSON.stringify(p1)})`)
  // Segundo cambio (simula recargar pantalla y volver a togglear)
  await fetch(`${BASE}/api/notifications/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${client.token}` },
    body: JSON.stringify({ preferPush: true, reminderEnabled: true }),
  })
  const prefs2 = await get('/api/notifications/preferences', client.token)
  const p2 = prefs2.body.preferences
  check('toggle parcial no borra las otras claves (preferWhatsapp sigue true)',
    p2?.preferWhatsapp === true && p2?.preferPush === true && p2?.reminderEnabled === true,
    `(obtuvo: ${JSON.stringify(p2)})`)

  console.log(`\nResultado: ${passed} pasaron, ${failed} fallaron`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Error inesperado:', e); process.exit(1) })
