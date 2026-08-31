// Verificación del hardening de seguridad.
// Requiere: seed de chatbot (node scripts/seed-chatbot-test.js) y el
// servidor corriendo en http://localhost:3000 para las pruebas HTTP.
//
// Pruebas:
//  1. /health responde
//  2. Registro con honeypot lleno → 201 falso y NO crea el usuario
//  3. 10 logins fallidos → cuenta bloqueada (servicio)
//  4. Reseña sin cita COMPLETED → 403 (servicio)
//  5. Barbero accediendo a earnings de otro → 403 (servicio)
//  6. Request desde origin no permitido → 403 (CORS)
//  7. Arranque sin JWT_SECRET → aborta (proceso hijo)
//
// Uso: node scripts/test-security.js
require('dotenv').config()
const { execSync, spawnSync } = require('child_process')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

// Antes de tocar la base: a dónde apunta este script.
require('../src/lib/dbTarget').announceDbTarget('test-security')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const BASE = 'http://localhost:3000'
let passed = 0
let failed = 0
const check = (label, condition, detail = '') => {
  if (condition) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label} ${detail}`) }
}

const main = async () => {
  // ── 1. /health ─────────────────────────────────────────────────────
  console.log('\nPRUEBA 1: /health responde')
  try {
    const r = await fetch(`${BASE}/health`)
    const j = await r.json()
    check('health status ok', r.status === 200 && j.status === 'ok')
  } catch (e) {
    check('health status ok', false, '(¿servidor corriendo?)')
  }

  // ── 2. Honeypot ────────────────────────────────────────────────────
  console.log('\nPRUEBA 2: registro con honeypot lleno → 201 falso, sin crear usuario')
  const botEmail = `bot-${Date.now()}@estilo.test`
  const r2 = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bot Malicioso', email: botEmail, password: 'bot12345',
      website: 'http://spam.example.com', // ← campo honeypot
    }),
  })
  const j2 = await r2.json()
  const botUser = await prisma.user.findUnique({ where: { email: botEmail } })
  check('responde 201 con mensaje de éxito falso', r2.status === 201 && /registrado/i.test(j2.message))
  check('el usuario NO fue creado en la BD', botUser === null)

  // ── 3. Bloqueo de cuenta tras intentos fallidos ────────────────────
  console.log('\nPRUEBA 3: 10 logins fallidos consecutivos → cuenta bloqueada 30 min')
  const authService = require('../src/services/auth.service')
  const lockEmail = 'lock-test@estilo.test'
  const goodPassword = 'correcta123'
  const hash = await bcrypt.hash(goodPassword, 10)
  await prisma.user.upsert({
    where: { email: lockEmail },
    update: { password: hash, loginAttempts: 0, lockedUntil: null, isActive: true },
    create: { email: lockEmail, name: 'Lock Test', password: hash, role: 'CLIENT', isVerified: true },
  })

  let lockedAtAttempt = null
  for (let i = 1; i <= 10; i++) {
    try {
      await authService.login({ email: lockEmail, password: 'incorrecta' }, '127.0.0.1')
    } catch (e) {
      if (/bloqueada/i.test(e.message) && lockedAtAttempt === null) lockedAtAttempt = i
    }
  }
  check('la cuenta se bloquea en el intento 10', lockedAtAttempt === 10, `(se bloqueó en: ${lockedAtAttempt})`)

  let blockedWithGoodPassword = false
  try {
    await authService.login({ email: lockEmail, password: goodPassword }, '127.0.0.1')
  } catch (e) {
    blockedWithGoodPassword = /bloqueada/i.test(e.message) && e.status === 423
  }
  check('incluso con contraseña correcta sigue bloqueada (423)', blockedWithGoodPassword)
  // Limpieza: desbloquear
  await prisma.user.update({ where: { email: lockEmail }, data: { loginAttempts: 0, lockedUntil: null } })

  // ── 4. Reseña sin cita COMPLETED → 403 ─────────────────────────────
  console.log('\nPRUEBA 4: reseña de una cita NO completada → 403')
  const reviewService = require('../src/services/review.service')
  const shop = await prisma.barbershop.findFirst({ where: { name: 'Barbería Test Chatbot' } })
  const client = await prisma.user.findUnique({ where: { email: 'seed-client@estilo.test' } })
  const barber = await prisma.barber.findFirst({ where: { barbershopId: shop.id } })
  const service = await prisma.service.findFirst({ where: { barbershopId: shop.id } })

  const pendingAppt = await prisma.appointment.create({
    data: {
      clientId: client.id, barbershopId: shop.id, barberId: barber.id, serviceId: service.id,
      date: new Date(), startTime: '09:00', endTime: '09:40', totalPrice: 25000, status: 'PENDING',
    },
  })
  let reviewError = null
  try {
    await reviewService.createReview({ appointmentId: pendingAppt.id, rating: 5, comment: 'fraude' }, client.id)
  } catch (e) { reviewError = e }
  check('lanza error 403 "solo citas completadas"', reviewError?.status === 403 && /completadas/i.test(reviewError.message), `(obtuvo: ${reviewError?.status} ${reviewError?.message})`)
  await prisma.appointment.delete({ where: { id: pendingAppt.id } })

  // ── 5. Earnings de otro barbero → 403 ──────────────────────────────
  console.log('\nPRUEBA 5: barbero accediendo a earnings de OTRO barbero → 403')
  const { getBarberEarnings } = require('../src/services/earnings.service')
  const garcia = await prisma.barber.findFirst({ where: { barbershopId: shop.id, user: { email: 'seed-juan-garcia@estilo.test' } } })
  const ramirezUser = await prisma.user.findUnique({ where: { email: 'seed-juan-ramirez@estilo.test' } })
  let earningsError = null
  try {
    await getBarberEarnings(garcia.id, 'month', ramirezUser.id, 'BARBER')
  } catch (e) { earningsError = e }
  check('lanza 403 "sin permiso"', earningsError?.status === 403, `(obtuvo: ${earningsError?.status} ${earningsError?.message})`)

  // ── 6. CORS: origin no permitido → 403 ─────────────────────────────
  console.log('\nPRUEBA 6: request desde origin no permitido → bloqueado (403)')
  const r6 = await fetch(`${BASE}/api/barbershops`, {
    headers: { Origin: 'https://sitio-malicioso.com' },
  })
  check('responde 403 Origen no permitido', r6.status === 403)
  const r6ok = await fetch(`${BASE}/api/barbershops`, {
    headers: { Origin: 'http://localhost:5173' },
  })
  check('origin permitido sigue funcionando (200)', r6ok.status === 200)
  const r6mobile = await fetch(`${BASE}/api/barbershops`)
  check('sin origin (app móvil) sigue funcionando (200)', r6mobile.status === 200)

  // ── 7. Arranque sin JWT_SECRET → aborta ────────────────────────────
  console.log('\nPRUEBA 7: arrancar sin JWT_SECRET → el proceso aborta con mensaje claro')
  const boot = spawnSync('node', ['-e', `
    process.env.JWT_SECRET = ''
    process.env.DATABASE_URL = 'postgresql://x'
    require('./src/config/env').validateEnv()
    console.log('NO DEBERIA LLEGAR AQUI')
  `], { cwd: process.cwd(), encoding: 'utf8' })
  check('proceso termina con exit code 1', boot.status === 1)
  check('muestra mensaje de configuración', /JWT_SECRET/.test(boot.stderr), `(stderr: ${boot.stderr?.slice(0, 100)})`)

  console.log(`\nResultado: ${passed} pasaron, ${failed} fallaron`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Error inesperado:', e); process.exit(1) })
