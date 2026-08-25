/**
 * Crea (o actualiza) el usuario administrador de Estilo.
 *
 * Idempotente: se puede ejecutar tantas veces como haga falta. Si el admin ya
 * existe no se le cambia la contraseña — así un re-deploy no pisa una clave que
 * el administrador ya rotó desde el panel.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." node backend/scripts/create-admin.js
 *   DATABASE_URL="postgresql://..." ADMIN_PASSWORD="..." node backend/scripts/create-admin.js
 *
 * La conexión se arma igual que en src/lib/prisma.js: Prisma 7 usa driver
 * adapters y el bloque `datasource` del schema no declara `url`, por lo que un
 * `new PrismaClient()` sin adapter no conecta a ninguna parte.
 */
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')
const pg = require('pg')

const ADMIN_EMAIL = 'admin@estilo.com'
const ADMIN_NAME = 'Brayan Claros'
const ADMIN_PHONE = '+573174506405'
const DEFAULT_PASSWORD = 'EstiloAdmin2026!'
const BCRYPT_ROUNDS = 10

function resolvePassword() {
  const fromEnv = process.env.ADMIN_PASSWORD
  if (fromEnv && fromEnv.trim()) {
    return { password: fromEnv, isDefault: false }
  }
  console.warn('⚠️  ADMIN_PASSWORD no está definida: se usará la contraseña por defecto.')
  console.warn('   Defínela para producción: ADMIN_PASSWORD="..." node backend/scripts/create-admin.js\n')
  return { password: DEFAULT_PASSWORD, isDefault: true }
}

/**
 * Traduce los errores de Prisma/pg a algo accionable. Devuelve null si el error
 * no es reconocido, para que el caller muestre el mensaje crudo.
 */
function explain(error) {
  const connCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNRESET']
  if (connCodes.includes(error.code) || error.code === 'P1001' || error.code === 'P1002') {
    return 'No pude conectar a BD. Verifica DATABASE_URL'
  }
  // 28P01 password auth failed, 28000 invalid authorization, 3D000 db inexistente
  if (['28P01', '28000', '3D000'].includes(error.code)) {
    return `No pude conectar a BD. Verifica DATABASE_URL (el servidor respondió: ${error.message})`
  }
  // 42P01: relación inexistente -> faltan migraciones
  if (error.code === '42P01' || error.code === 'P2021') {
    return 'La tabla "users" no existe en esta base de datos. Aplica las migraciones primero: npx prisma migrate deploy'
  }
  // 42703 / P2022: columna inexistente -> schema desincronizado
  if (error.code === '42703' || error.code === 'P2022') {
    const column = error.meta?.column || error.column || 'desconocida'
    return `Falta el campo ${column} en el schema (agregarlo al script). La BD no tiene esa columna: aplica las migraciones con npx prisma migrate deploy`
  }
  // P2012 / P2011: falta un valor requerido que el script no está enviando
  if (error.code === 'P2012' || error.code === 'P2011') {
    const field = error.meta?.path || error.meta?.target || error.meta?.constraint || 'desconocido'
    return `Falta el campo ${field} en el schema (agregarlo al script)`
  }
  return null
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw Object.assign(new Error('DATABASE_URL no está definida'), { code: 'ENOTFOUND' })
  }

  const { password, isDefault } = resolvePassword()
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const existing = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true, role: true },
    })

    // Campos que siempre se reconcilian, existiera o no el usuario. Se dejan
    // fuera `password` y `tokenVersion` a propósito: no queremos invalidar la
    // sesión ni la contraseña de un admin que ya está operando.
    const shared = {
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      // El admin acepta los términos vigentes de forma implícita: si quedara en
      // false, el middleware legal lo forzaría a re-aceptar antes de operar.
      currentTermsAccepted: true,
    }

    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: shared,
      create: {
        email: ADMIN_EMAIL,
        password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        ...shared,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, isVerified: true },
    })

    const created = !existing
    console.log('═'.repeat(58))
    console.log(created ? '  ADMIN CREADO' : '  ADMIN YA EXISTÍA — datos reconciliados')
    console.log('═'.repeat(58))
    console.log(`  Email     : ${admin.email}`)
    if (created) {
      console.log(`  Password  : ${password}${isDefault ? '   (por defecto)' : ''}`)
    } else {
      console.log('  Password  : (sin cambios — el usuario ya existía)')
    }
    console.log(`  ID        : ${admin.id}`)
    console.log(`  Nombre    : ${admin.name}`)
    console.log(`  Rol       : ${admin.role}`)
    console.log(`  Activo    : ${admin.isActive}   Verificado: ${admin.isVerified}`)
    console.log('═'.repeat(58))
    if (created) {
      console.log('  ⚠️  Cambia la contraseña en el primer inicio de sesión.')
    } else {
      console.log('  ℹ️  Para restablecer la contraseña, usa "olvidé mi contraseña"')
      console.log('      o borra el usuario y vuelve a ejecutar este script.')
    }
    console.log('═'.repeat(58))
  } finally {
    await prisma.$disconnect().catch(() => {})
    await pool.end().catch(() => {})
  }
}

function reportFailure(error) {
  const message = explain(error)
  console.error('\n❌ ' + (message || error.message))
  if (!message) {
    console.error('   (error no reconocido — detalle completo abajo)')
    console.error(error)
  }
}

// Ejecutable por CLI y reutilizable desde seed-production.js.
if (require.main === module) {
  main().catch((error) => {
    reportFailure(error)
    process.exitCode = 1
  })
}

module.exports = { main, reportFailure, ADMIN_EMAIL }
