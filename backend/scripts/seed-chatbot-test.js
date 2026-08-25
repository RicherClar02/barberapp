// Seed de prueba para el flujo de desambiguación del chatbot:
// una barbería con dos barberos "Juan García" y "Juan Ramírez" (ambiguos)
// y un "Pedro López" (único). Idempotente: usa upsert por email.
// Uso: node scripts/seed-chatbot-test.js
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SHOP_NAME = 'Barbería Test Chatbot'

const upsertUser = async (email, name, role) => {
  const password = await bcrypt.hash('test1234', 10)
  return prisma.user.upsert({
    where: { email },
    update: { name, role, isVerified: true, isActive: true },
    create: { email, name, role, password, isVerified: true, isActive: true },
  })
}

const main = async () => {
  const owner = await upsertUser('seed-owner@estilo.test', 'Owner Test', 'OWNER')
  const client = await upsertUser('seed-client@estilo.test', 'Cliente Test', 'CLIENT')
  const juanG = await upsertUser('seed-juan-garcia@estilo.test', 'Juan García', 'BARBER')
  const juanR = await upsertUser('seed-juan-ramirez@estilo.test', 'Juan Ramírez', 'BARBER')
  const pedro = await upsertUser('seed-pedro@estilo.test', 'Pedro López', 'BARBER')

  let shop = await prisma.barbershop.findFirst({ where: { name: SHOP_NAME, ownerId: owner.id } })
  if (!shop) {
    shop = await prisma.barbershop.create({
      data: {
        name: SHOP_NAME,
        // Acacías (no Villavicencio) para no interferir con el seed demo
        address: 'Calle 1 #2-34',
        city: 'Acacías',
        department: 'Meta',
        ownerId: owner.id,
        isActive: true,
        isVisible: true,
      },
    })
  }

  // Horario: todos los días 08:00–20:00
  for (let day = 0; day <= 6; day++) {
    const existing = await prisma.schedule.findFirst({ where: { barbershopId: shop.id, dayOfWeek: day } })
    if (!existing) {
      await prisma.schedule.create({
        data: { barbershopId: shop.id, dayOfWeek: day, openTime: '08:00', closeTime: '20:00', isOpen: true },
      })
    }
  }

  let service = await prisma.service.findFirst({ where: { barbershopId: shop.id, name: 'Corte Clásico' } })
  if (!service) {
    service = await prisma.service.create({
      data: { barbershopId: shop.id, name: 'Corte Clásico', price: 25000, duration: 40, isActive: true },
    })
  }

  const ensureBarber = async (user, specialty) => {
    const existing = await prisma.barber.findFirst({ where: { userId: user.id, barbershopId: shop.id } })
    if (existing) return prisma.barber.update({ where: { id: existing.id }, data: { specialty, isActive: true } })
    return prisma.barber.create({ data: { userId: user.id, barbershopId: shop.id, specialty, isActive: true } })
  }

  const bJuanG = await ensureBarber(juanG, 'Fades')
  const bJuanR = await ensureBarber(juanR, 'Clásicos')
  const bPedro = await ensureBarber(pedro, 'Barbas')

  console.log('Seed listo:')
  console.log('  barbershopId:', shop.id)
  console.log('  clientId    :', client.id)
  console.log('  serviceId   :', service.id, '(Corte Clásico)')
  console.log('  Juan García :', bJuanG.id, '(Fades)')
  console.log('  Juan Ramírez:', bJuanR.id, '(Clásicos)')
  console.log('  Pedro López :', bPedro.id, '(Barbas)')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
