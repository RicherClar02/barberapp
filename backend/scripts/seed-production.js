/**
 * Semilla mínima de producción.
 *
 * Pensado para que el deploy lo invoque sin intervención manual (por ejemplo
 * desde el post-deploy de Render). Hoy solo garantiza que exista el usuario
 * administrador; cuando haga falta sembrar más datos base (planes, configuración
 * por defecto, etc.) se añaden aquí como pasos adicionales.
 *
 * Es idempotente porque cada paso lo es: ejecutarlo en cada deploy es seguro.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." ADMIN_PASSWORD="..." node backend/scripts/seed-production.js
 *
 * A diferencia de seed-demo.js, este script NO crea datos de prueba: no toca
 * barberías, barberos ni citas.
 */
const { main: createAdmin, reportFailure } = require('./create-admin')

const steps = [
  { name: 'Usuario administrador', run: createAdmin },
]

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw Object.assign(new Error('DATABASE_URL no está definida'), { code: 'ENOTFOUND' })
  }

  console.log('\n▶ Semilla de producción — ' + steps.length + ' paso(s)\n')

  for (const [index, step] of steps.entries()) {
    console.log(`── [${index + 1}/${steps.length}] ${step.name} ─────────────────────`)
    await step.run()
    console.log('')
  }

  console.log('✅ Semilla de producción completada.\n')
}

if (require.main === module) {
  seed().catch((error) => {
    reportFailure(error)
    process.exitCode = 1
  })
}

module.exports = { seed }
