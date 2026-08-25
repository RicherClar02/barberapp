// Migración de rebranding: mueve los correos de los usuarios demo del
// dominio viejo (@barberapp.com / @barberapp.test) al nuevo (@estilo.com /
// @estilo.test) RENOMBRANDO en sitio, no borrando.
//
// Por qué renombrar y no borrar: User no tiene onDelete: Cascade, así que
// un deleteMany falla con violación de FK en cuanto el usuario es dueño de
// una barbería o tiene citas/reseñas. Renombrar conserva todas las
// relaciones y deja el seed idempotente (upsert encuentra al mismo usuario).
//
// De paso resetea loginAttempts/lockedUntil de TODOS los usuarios.
//
// Uso: node scripts/migrate-emails-estilo.js
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const rename = (email) =>
  email.replace(/@barberapp\.com$/, '@estilo.com').replace(/@barberapp\.test$/, '@estilo.test')

const main = async () => {
  const legacy = await prisma.user.findMany({
    where: { email: { contains: '@barberapp.' } },
    select: { id: true, email: true },
    orderBy: { email: 'asc' },
  })

  if (legacy.length === 0) console.log('No quedan usuarios con dominio @barberapp.*')

  let renamed = 0
  const collisions = []

  for (const user of legacy) {
    const target = rename(user.email)
    const taken = await prisma.user.findUnique({ where: { email: target }, select: { id: true } })

    // Si el correo nuevo ya existe (p.ej. un seed corrido antes de migrar),
    // no se puede renombrar: el email es único. Se reporta para revisión manual.
    if (taken && taken.id !== user.id) {
      collisions.push({ from: user.email, to: target })
      continue
    }

    await prisma.user.update({ where: { id: user.id }, data: { email: target } })
    console.log(`  ${user.email} → ${target}`)
    renamed++
  }

  // Desbloqueo global: ningún usuario queda con bloqueo por intentos fallidos
  const unlocked = await prisma.user.updateMany({ data: { loginAttempts: 0, lockedUntil: null } })

  console.log(`\nRenombrados: ${renamed}`)
  console.log(`Bloqueos reseteados: ${unlocked.count} usuarios`)

  if (collisions.length) {
    console.log('\n⚠ Colisiones (el correo destino ya existía, NO se renombró):')
    collisions.forEach(c => console.log(`  ${c.from} → ${c.to} (ocupado)`))
    console.log('  Revisa manualmente cuál de los dos usuarios conserva los datos.')
  }

  const left = await prisma.user.count({ where: { email: { contains: '@barberapp.' } } })
  console.log(`\nUsuarios con dominio viejo restantes: ${left}`)
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
