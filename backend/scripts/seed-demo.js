// Seed de datos de demostración para ESTILO (idempotente).
// Crea: 1 ADMIN, 4 barberías (3 en Villavicencio con planes PREMIUM/
// STANDARD/BASIC y fichas completas + 1 en Bogotá incompleta para el
// test de completeness), barberos, servicios, 5 clientes, 15 citas,
// reseñas (rating alto en la PREMIUM y un barbero con rating < 3.0),
// 1 suscripción activa por barbería y 1 anuncio pagado en la PREMIUM.
//
// Uso: node scripts/seed-demo.js
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

// Antes de tocar la base: a dónde apunta este script.
require('../src/lib/dbTarget').announceDbTarget('seed-demo')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const IMG = 'https://placehold.co/600x400/4A2C0A/C49A6C?text=ESTILO'
const LOGO = 'https://placehold.co/200x200/C49A6C/FFFFFF?text=Logo'

const day = (offset) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

const upsertUser = async (email, name, role, password, extra = {}) => {
  const hash = await bcrypt.hash(password, 10)
  return prisma.user.upsert({
    where: { email },
    // password también en update: garantiza las credenciales documentadas
    // aunque el usuario ya existiera con otra contraseña
    update: { name, role, password: hash, isVerified: true, isActive: true, loginAttempts: 0, lockedUntil: null, ...extra },
    create: { email, name, role, password: hash, isVerified: true, isActive: true, ...extra },
  })
}

const ensureShop = async (ownerId, data) => {
  const existing = await prisma.barbershop.findFirst({ where: { name: data.name, ownerId } })
  if (existing) return prisma.barbershop.update({ where: { id: existing.id }, data })
  return prisma.barbershop.create({ data: { ...data, ownerId } })
}

const ensureSchedules = async (barbershopId) => {
  // L-S 9am-7pm, domingo cerrado
  for (let dow = 0; dow <= 6; dow++) {
    const existing = await prisma.schedule.findFirst({ where: { barbershopId, dayOfWeek: dow } })
    const data = dow === 0
      ? { openTime: '09:00', closeTime: '19:00', isOpen: false }
      : { openTime: '09:00', closeTime: '19:00', isOpen: true }
    if (existing) await prisma.schedule.update({ where: { id: existing.id }, data })
    else await prisma.schedule.create({ data: { barbershopId, dayOfWeek: dow, ...data } })
  }
}

const ensureBarber = async (userId, barbershopId, specialty, bio) => {
  const existing = await prisma.barber.findFirst({ where: { userId, barbershopId } })
  if (existing) return prisma.barber.update({ where: { id: existing.id }, data: { specialty, bio, isActive: true } })
  return prisma.barber.create({ data: { userId, barbershopId, specialty, bio, isActive: true } })
}

const ensureService = async (barbershopId, name, price, duration, description) => {
  const existing = await prisma.service.findFirst({ where: { barbershopId, name } })
  if (existing) return prisma.service.update({ where: { id: existing.id }, data: { price, duration, description, isActive: true } })
  return prisma.service.create({ data: { barbershopId, name, price, duration, description, isActive: true } })
}

const ensurePhotos = async (barbershopId, count) => {
  const existing = await prisma.shopPhoto.count({ where: { barbershopId } })
  for (let i = existing; i < count; i++) {
    await prisma.shopPhoto.create({
      data: { barbershopId, url: `${IMG}+${i + 1}`, caption: `Foto ${i + 1}` },
    })
  }
}

const main = async () => {
  console.log('— Sembrando datos demo de ESTILO —\n')

  // ── 1. ADMIN ─────────────────────────────────────────────────────
  await upsertUser('admin@estilo.com', 'Administrador', 'ADMIN', 'Admin123!')
  console.log('✓ Admin: admin@estilo.com / Admin123!')

  // ── 2. Owners ────────────────────────────────────────────────────
  const ownerImperial = await upsertUser('owner.imperial@estilo.com', 'Carlos Mendoza', 'OWNER', 'Owner123!', { department: 'Meta', city: 'Villavicencio' })
  const ownerNavaja = await upsertUser('owner.navaja@estilo.com', 'Andrés Rojas', 'OWNER', 'Owner123!', { department: 'Meta', city: 'Villavicencio' })
  const ownerClasica = await upsertUser('owner.clasica@estilo.com', 'Miguel Torres', 'OWNER', 'Owner123!', { department: 'Meta', city: 'Villavicencio' })
  const ownerBogota = await upsertUser('owner.bogota@estilo.com', 'Felipe Castro', 'OWNER', 'Owner123!', { department: 'Cundinamarca', city: 'Bogotá' })
  console.log('✓ 4 owners (Owner123!)')

  // ── 3. Barberías ─────────────────────────────────────────────────
  // Fichas completas: descripción + dirección + lat/lng reales de
  // Villavicencio + logo + portada + 3 fotos + servicios
  const imperial = await ensureShop(ownerImperial.id, {
    name: 'Barbería Imperial',
    description: 'La barbería premium de Villavicencio. Más de 10 años perfeccionando fades, diseños y rituales de barba con productos importados.',
    address: 'Cra. 33 #41-20, Centro',
    city: 'Villavicencio', department: 'Meta',
    latitude: 4.1420, longitude: -73.6266,
    phone: '3101112233', logo: LOGO, coverImage: IMG,
    plan: 'PREMIUM', isFeatured: true, isActive: true, isVisible: true, isVerified: true,
    amenities: JSON.stringify(['WiFi', 'Parqueadero', 'A/C', 'Café']),
  })
  const navaja = await ensureShop(ownerNavaja.id, {
    name: 'La Navaja de Oro',
    description: 'Cortes clásicos y modernos en el corazón del barrio Barzal. Atención de primera y ambiente familiar.',
    address: 'Cl. 33A #38-25, Barzal',
    city: 'Villavicencio', department: 'Meta',
    latitude: 4.1500, longitude: -73.6350,
    phone: '3122223344', logo: LOGO, coverImage: IMG,
    plan: 'STANDARD', isFeatured: false, isActive: true, isVisible: true, isVerified: true,
    amenities: JSON.stringify(['WiFi', 'A/C']),
  })
  const clasica = await ensureShop(ownerClasica.id, {
    name: 'Barbería Clásica del Llano',
    description: 'Tradición llanera en cada corte. Precios justos y servicio honesto desde 2015.',
    address: 'Cl. 15 #39-40, Porfía',
    city: 'Villavicencio', department: 'Meta',
    latitude: 4.1352, longitude: -73.6190,
    phone: '3133334455', logo: LOGO, coverImage: IMG,
    plan: 'BASIC', isFeatured: false, isActive: true, isVisible: true, isVerified: true,
  })
  // Bogotá: ficha INCOMPLETA a propósito (sin logo, portada ni fotos)
  // para probar GET /api/barbershops/:id/completeness
  const capital = await ensureShop(ownerBogota.id, {
    name: 'Barbería Capital',
    description: null,
    address: 'Cra. 7 #45-10, Chapinero',
    city: 'Bogotá', department: 'Cundinamarca',
    latitude: 4.6486, longitude: -74.0628,
    phone: '3144445566', logo: null, coverImage: null,
    plan: 'STANDARD', isFeatured: false, isActive: true, isVisible: true, isVerified: true,
  })
  console.log('✓ 4 barberías (Imperial PREMIUM, Navaja STANDARD, Clásica BASIC, Capital Bogotá)')

  for (const shop of [imperial, navaja, clasica, capital]) await ensureSchedules(shop.id)
  await ensurePhotos(imperial.id, 4)
  await ensurePhotos(navaja.id, 3)
  await ensurePhotos(clasica.id, 3)
  console.log('✓ Horarios L-S 9am-7pm y fotos')

  // ── 4. Barberos (respetando límite del plan: BASIC=1) ───────────
  const bUser1 = await upsertUser('barber.julian@estilo.com', 'Julián Herrera', 'BARBER', 'Barber123!')
  const bUser2 = await upsertUser('barber.david@estilo.com', 'David Pacheco', 'BARBER', 'Barber123!')
  const bUser3 = await upsertUser('barber.sebastian@estilo.com', 'Sebastián Mora', 'BARBER', 'Barber123!')
  const bUser4 = await upsertUser('barber.camilo@estilo.com', 'Camilo Vargas', 'BARBER', 'Barber123!')
  const bUser5 = await upsertUser('barber.esteban@estilo.com', 'Esteban Ruiz', 'BARBER', 'Barber123!')
  const bUser6 = await upsertUser('barber.oscar@estilo.com', 'Óscar Pinto', 'BARBER', 'Barber123!')
  const bUser7 = await upsertUser('barber.leo@estilo.com', 'Leonardo Gil', 'BARBER', 'Barber123!')
  const bUser8 = await upsertUser('barber.nico@estilo.com', 'Nicolás Pardo', 'BARBER', 'Barber123!')

  const julian = await ensureBarber(bUser1.id, imperial.id, 'Fades y diseños', '8 años de experiencia, especialista en degradados.')
  const david = await ensureBarber(bUser2.id, imperial.id, 'Barbas', 'Ritual de barba con toalla caliente.')
  await ensureBarber(bUser3.id, imperial.id, 'Cortes clásicos', 'Precisión en tijera y estilo clásico.')
  const camilo = await ensureBarber(bUser4.id, navaja.id, 'Cortes modernos', 'Tendencias y estilos urbanos.')
  const esteban = await ensureBarber(bUser5.id, navaja.id, 'Fades', 'Mid y low fade impecables.') // ← rating bajo
  await ensureBarber(bUser6.id, navaja.id, 'Niños', 'Paciencia y buen trato con los más pequeños.')
  const leo = await ensureBarber(bUser7.id, clasica.id, 'Todo tipo de corte', 'El barbero de confianza de Porfía.')
  await ensureBarber(bUser8.id, capital.id, 'Cortes ejecutivos', 'Estilo profesional para la capital.')
  console.log('✓ 8 barberos (Barber123!)')

  // ── 5. Servicios (precios COP realistas) ─────────────────────────
  const svcImperial = []
  svcImperial.push(await ensureService(imperial.id, 'Corte Clásico', 28000, 40, 'Corte tradicional con acabado a navaja'))
  svcImperial.push(await ensureService(imperial.id, 'Corte + Barba', 42000, 60, 'Combo completo con ritual de toalla caliente'))
  await ensureService(imperial.id, 'Ritual de Barba Premium', 30000, 40, 'Aceites, toalla caliente y perfilado')
  await ensureService(imperial.id, 'Diseño Freestyle', 35000, 60, 'Diseños personalizados en el cabello')
  await ensureService(imperial.id, 'Cejas', 10000, 20, 'Perfilado de cejas con navaja')

  const svcNavaja = []
  svcNavaja.push(await ensureService(navaja.id, 'Corte Clásico', 22000, 40, 'Corte tradicional'))
  svcNavaja.push(await ensureService(navaja.id, 'Corte + Barba', 34000, 60, 'Corte y arreglo de barba'))
  await ensureService(navaja.id, 'Afeitado Clásico', 18000, 30, 'Afeitado con navaja y espuma caliente')
  await ensureService(navaja.id, 'Corte Niño', 18000, 30, 'Para menores de 12 años')

  const svcClasica = []
  svcClasica.push(await ensureService(clasica.id, 'Corte Sencillo', 15000, 30, 'Corte rápido y bien hecho'))
  await ensureService(clasica.id, 'Corte + Barba', 25000, 50, 'El combo del barrio')
  await ensureService(clasica.id, 'Barba', 12000, 20, 'Perfilado de barba')
  await ensureService(clasica.id, 'Cejas', 8000, 15, 'Perfilado sencillo')

  await ensureService(capital.id, 'Corte Ejecutivo', 35000, 40, 'Corte profesional para oficina')
  await ensureService(capital.id, 'Corte + Barba', 50000, 60, 'Combo ejecutivo completo')
  await ensureService(capital.id, 'Afeitado Express', 20000, 20, 'Rápido y limpio')
  await ensureService(capital.id, 'Mascarilla Facial', 25000, 30, 'Limpieza facial post-corte')
  console.log('✓ 17 servicios')

  // ── 6. Clientes ──────────────────────────────────────────────────
  const clients = []
  for (let i = 1; i <= 5; i++) {
    clients.push(await upsertUser(`cliente${i}@estilo.test`, `Cliente Demo ${i}`, 'CLIENT', 'Cliente123!', { department: 'Meta', city: 'Villavicencio' }))
  }
  console.log('✓ 5 clientes (Cliente123!)')

  // ── 7. Citas y reseñas (recreadas desde cero para idempotencia) ──
  const shopIds = [imperial.id, navaja.id, clasica.id, capital.id]
  await prisma.review.deleteMany({ where: { barbershopId: { in: shopIds } } })
  await prisma.payment.deleteMany({ where: { appointment: { barbershopId: { in: shopIds } } } })
  await prisma.appointment.deleteMany({ where: { barbershopId: { in: shopIds } } })

  const mkAppt = (clientIdx, shop, barber, service, dateOffset, startTime, status) => {
    const [h, m] = startTime.split(':').map(Number)
    const endTotal = h * 60 + m + service.duration
    const endTime = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`
    return prisma.appointment.create({
      data: {
        clientId: clients[clientIdx].id,
        barbershopId: shop.id,
        barberId: barber.id,
        serviceId: service.id,
        date: day(dateOffset),
        startTime, endTime,
        totalPrice: service.price,
        status,
      },
    })
  }

  // 10 COMPLETED (días pasados) — 5 en Imperial (5★) y 5 con Esteban (2★ → lowRating)
  const completed = []
  completed.push(await mkAppt(0, imperial, julian, svcImperial[0], -6, '10:00', 'COMPLETED'))
  completed.push(await mkAppt(1, imperial, julian, svcImperial[1], -5, '11:00', 'COMPLETED'))
  completed.push(await mkAppt(2, imperial, david, svcImperial[0], -4, '15:00', 'COMPLETED'))
  completed.push(await mkAppt(3, imperial, david, svcImperial[1], -3, '16:00', 'COMPLETED'))
  completed.push(await mkAppt(4, imperial, julian, svcImperial[0], -2, '09:00', 'COMPLETED'))
  completed.push(await mkAppt(0, navaja, esteban, svcNavaja[0], -6, '10:00', 'COMPLETED'))
  completed.push(await mkAppt(1, navaja, esteban, svcNavaja[0], -5, '12:00', 'COMPLETED'))
  completed.push(await mkAppt(2, navaja, esteban, svcNavaja[1], -4, '14:00', 'COMPLETED'))
  completed.push(await mkAppt(3, navaja, esteban, svcNavaja[0], -3, '17:00', 'COMPLETED'))
  completed.push(await mkAppt(4, navaja, esteban, svcNavaja[0], -2, '18:00', 'COMPLETED'))

  // 4 CONFIRMED (2 hoy, 2 mañana) + 1 PENDING = 15 citas en total
  await mkAppt(0, imperial, julian, svcImperial[0], 0, '14:00', 'CONFIRMED')
  await mkAppt(1, navaja, camilo, svcNavaja[0], 0, '16:00', 'CONFIRMED')
  await mkAppt(2, imperial, david, svcImperial[1], 1, '10:00', 'CONFIRMED')
  await mkAppt(3, clasica, leo, svcClasica[0], 1, '11:00', 'CONFIRMED')
  await mkAppt(4, clasica, leo, svcClasica[0], 1, '15:00', 'PENDING')
  console.log('✓ 15 citas (10 COMPLETED, 4 CONFIRMED hoy/mañana, 1 PENDING)')

  // Reseñas: Imperial rating alto (5★ x5) | Esteban rating bajo (2★ x5)
  const fiveStar = ['Excelente servicio 💈', 'El mejor fade de Villavo', 'Volveré sin duda', 'Atención de lujo', 'Impecable']
  const twoStar = ['Me dejó trasquilado', 'Muy demorado y mal acabado', 'No quedé contento', 'Esperaba más', 'No lo recomiendo']
  for (let i = 0; i < 5; i++) {
    await prisma.review.create({
      data: {
        clientId: completed[i].clientId,
        barbershopId: imperial.id,
        barberId: completed[i].barberId,
        appointmentId: completed[i].id,
        rating: 5,
        comment: fiveStar[i],
      },
    })
    await prisma.review.create({
      data: {
        clientId: completed[5 + i].clientId,
        barbershopId: navaja.id,
        barberId: esteban.id,
        appointmentId: completed[5 + i].id,
        rating: 2,
        comment: twoStar[i],
      },
    })
  }
  console.log('✓ 10 reseñas (Imperial 5.0★ | Esteban 2.0★ → lowRating)')

  // ── 8. Suscripciones activas ─────────────────────────────────────
  const PLAN_PRICES = { BASIC: 30000, STANDARD: 60000, PREMIUM: 120000 }
  const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  for (const shop of [imperial, navaja, clasica, capital]) {
    await prisma.subscription.upsert({
      where: { barbershopId: shop.id },
      update: { plan: shop.plan, status: 'ACTIVE', startDate: new Date(), endDate: end, amountPaid: PLAN_PRICES[shop.plan] },
      create: { barbershopId: shop.id, plan: shop.plan, status: 'ACTIVE', endDate: end, amountPaid: PLAN_PRICES[shop.plan], paymentMethod: 'CASH' },
    })
  }
  console.log('✓ 4 suscripciones ACTIVE (30 días)')

  // ── 9. Anuncio activo y pagado en la PREMIUM ─────────────────────
  await prisma.advertisement.deleteMany({ where: { barbershopId: imperial.id } })
  await prisma.advertisement.create({
    data: {
      barbershopId: imperial.id,
      title: '20% OFF en Corte + Barba esta semana',
      mediaUrl: IMG,
      mediaType: 'image',
      isActive: true,
      isPaid: true,
      amountPaid: 50000,
      startsAt: day(-1),
      endsAt: day(30),
    },
  })
  console.log('✓ 1 anuncio activo y pagado (Barbería Imperial)')

  // ── 10. Desbloqueo global ────────────────────────────────────────
  // Intentos fallidos previos pueden dejar cuentas con lockedUntil en el
  // futuro. Tras sembrar, ninguna cuenta debe quedar bloqueada.
  const unlocked = await prisma.user.updateMany({ data: { loginAttempts: 0, lockedUntil: null } })
  console.log(`✓ Bloqueos de login reseteados (${unlocked.count} usuarios)`)

  console.log('\n— Seed demo completo —')
  console.log('Credenciales:')
  console.log('  ADMIN : admin@estilo.com / Admin123!')
  console.log('  OWNER : owner.imperial@estilo.com / Owner123!')
  console.log('  BARBER: barber.julian@estilo.com / Barber123!')
  console.log('  CLIENT: cliente1@estilo.test / Cliente123!')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
