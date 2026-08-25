// Pruebas del flujo de desambiguación del chatbot.
// Requiere haber corrido antes: node scripts/seed-chatbot-test.js
//
// Casos (del CLAUDE.md):
//  a) "cita con Juan"   → debe pedir aclaración (dos Juanes)
//  b) "con García"      → debe resolver a Juan García y confirmar
//  c) "cita con Carlos" → no existe: debe listar los barberos
//  d) "cita con Pedro"  → único: debe proceder directo
//
// Sin ANTHROPIC_API_KEY se prueban la resolución determinista y la
// validación defensiva del backend (las mismas reglas que aplica la IA).
// Con API key se ejecutan además las 4 conversaciones reales contra
// processMessage().
//
// Uso: node scripts/test-chatbot-disambiguation.js
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const {
  processMessage, resolveBarberByName, resolveBarberForBooking, loadShopContext,
} = require('../src/services/chatbot.service')

let passed = 0
let failed = 0
const check = (label, condition, detail = '') => {
  if (condition) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label} ${detail}`) }
}

const main = async () => {
  const shop = await prisma.barbershop.findFirst({ where: { name: 'Barbería Test Chatbot' } })
  const client = await prisma.user.findUnique({ where: { email: 'seed-client@estilo.test' } })
  if (!shop || !client) {
    console.error('Falta el seed. Ejecuta primero: node scripts/seed-chatbot-test.js')
    process.exit(1)
  }

  const ctx = await loadShopContext(shop.id)
  console.log(`Contexto cargado: ${ctx.barbers.length} barberos →`,
    ctx.barbers.map(b => `${b.name} (${b.specialty})`).join(', '))

  // ── Pruebas deterministas (resolución + validación defensiva) ──────────
  console.log('\nPRUEBA a) "cita con Juan" → ambiguo, debe pedir aclaración')
  const a = resolveBarberByName('Juan', ctx.barbers)
  check('status = ambiguous con 2 coincidencias', a.status === 'ambiguous' && a.matches.length === 2, `(obtuvo: ${a.status}, ${a.matches?.length})`)
  const aBooking = await resolveBarberForBooking({ barberId: null, barberName: 'Juan' }, shop.id, ctx)
  check('booking devuelve aclaración (no crea cita)', !!aBooking.error && aBooking.error.includes('¿Con cuál prefieres'), `(obtuvo: ${aBooking.error || 'sin error'})`)
  if (aBooking.error) console.log('  Respuesta al cliente:\n  ' + aBooking.error.replace(/\n/g, '\n  '))

  console.log('\nPRUEBA b) "con García" → debe resolver a Juan García')
  const b = resolveBarberByName('con García', ctx.barbers)
  check('resuelve a Juan García', b.status === 'resolved' && b.barber.name === 'Juan García', `(obtuvo: ${b.status}, ${b.barber?.name})`)
  const b2 = resolveBarberByName('el de fades', ctx.barbers)
  check('"el de fades" también resuelve a Juan García', b2.status === 'resolved' && b2.barber.name === 'Juan García', `(obtuvo: ${b2.status}, ${b2.barber?.name})`)

  console.log('\nPRUEBA c) "cita con Carlos" → no existe, debe listar los barberos')
  const c = resolveBarberByName('Carlos', ctx.barbers)
  check('status = none', c.status === 'none', `(obtuvo: ${c.status})`)
  const cBooking = await resolveBarberForBooking({ barberId: null, barberName: 'Carlos' }, shop.id, ctx)
  check('booking responde "No tenemos..." con la lista', !!cBooking.error && cBooking.error.includes('No tenemos un barbero llamado') && cBooking.error.includes('Pedro López'), `(obtuvo: ${cBooking.error})`)
  if (cBooking.error) console.log('  Respuesta al cliente:\n  ' + cBooking.error.replace(/\n/g, '\n  '))

  console.log('\nPRUEBA d) "cita con Pedro" → único, debe proceder directo')
  const d = resolveBarberByName('Pedro', ctx.barbers)
  check('resuelve a Pedro López', d.status === 'resolved' && d.barber.name === 'Pedro López', `(obtuvo: ${d.status}, ${d.barber?.name})`)
  const dBooking = await resolveBarberForBooking({ barberId: null, barberName: 'Pedro' }, shop.id, ctx)
  check('booking resuelve sin pedir aclaración', !!dBooking.barber && dBooking.barber.name === 'Pedro López')

  console.log('\nPRUEBA extra) barberId inválido o de otra barbería → aclaración, nunca 500')
  const e1 = await resolveBarberForBooking({ barberId: 'id-falso-inexistente', barberName: 'Juan' }, shop.id, ctx)
  check('barberId falso + nombre ambiguo → aclaración', !!e1.error, `(obtuvo: ${JSON.stringify(e1)})`)
  const e2 = await resolveBarberForBooking({ barberId: 'id-falso-inexistente', barberName: 'Pedro' }, shop.id, ctx)
  check('barberId falso + nombre único → recupera por nombre', !!e2.barber && e2.barber.name === 'Pedro López')

  // ── Pruebas conversacionales reales (requieren ANTHROPIC_API_KEY) ─────
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('\n── Conversaciones reales contra la IA ──')
    const say = async (text) => {
      const r = await processMessage(client.id, shop.id, text)
      console.log(`\n  Cliente: ${text}`)
      console.log(`  Bot [${r.intent}]: ${r.reply}`)
      return r
    }
    const ra = await say('Quiero una cita con Juan mañana a las 10:00 para un corte clásico')
    check('(IA) "con Juan" pide aclaración', ra.intent === 'clarify' || /¿con cuál/i.test(ra.reply))
    const rb = await say('con García')
    check('(IA) "con García" resuelve y avanza', rb.intent !== 'clarify' || /garcía/i.test(rb.reply))
    const rc = await say('Mejor quiero una cita con Carlos')
    check('(IA) "con Carlos" lista los barberos', /no tenemos|nuestros barberos/i.test(rc.reply))
    const rd = await say('Dame una cita con Pedro pasado mañana a las 11:00 para un corte clásico')
    check('(IA) "con Pedro" procede directo', rd.intent === 'book_appointment' || /pedro/i.test(rd.reply))
  } else {
    console.log('\n(ANTHROPIC_API_KEY no configurada: se omiten las conversaciones reales contra la IA)')
  }

  console.log(`\nResultado: ${passed} pasaron, ${failed} fallaron`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Error inesperado:', e); process.exit(1) })
