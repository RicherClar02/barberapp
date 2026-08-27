const test = require('node:test')
const assert = require('node:assert')

// barber.service.js hace `require('../lib/prisma')` al cargarse, y ese módulo
// abre un pg.Pool contra DATABASE_URL. Se siembra el require cache con un doble
// ANTES de pedir el servicio, así el módulo real nunca se ejecuta y la suite
// corre sin base de datos ni variables de entorno.
const prismaPath = require.resolve('../src/lib/prisma')

const prisma = {
  barbershop: { findUnique: async () => null },
  user: { findUnique: async () => null },
  barber: {
    count: async () => 0,
    findFirst: async () => null,
    create: async ({ data }) => ({ id: 'barber-nuevo', ...data })
  }
}

require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: prisma
}

const { addBarber } = require('../src/services/barber.service')

const OWNER_ID = 'owner-1'
const SHOP_ID = 'shop-1'

// Los límites que el negocio vende: Básico 2 barberos, Estándar 4,
// Premium ilimitados.
const PLANS = [
  { plan: 'BASIC', limit: 2 },
  { plan: 'STANDARD', limit: 4 }
]

// Coloca la barbería en un plan con `activeCount` barberos activos ya dados de
// alta. El usuario a agregar siempre es un BARBER válido que aún no pertenece
// a la barbería, para que lo único bajo prueba sea el tope del plan.
const escenario = ({ plan, activeCount }) => {
  prisma.barbershop.findUnique = async () => ({ id: SHOP_ID, ownerId: OWNER_ID, plan })
  prisma.barber.count = async () => activeCount
  prisma.user.findUnique = async ({ where }) => ({ id: where.id, role: 'BARBER' })
  prisma.barber.findFirst = async () => null
}

const agregar = (userId = 'user-nuevo') =>
  addBarber({ userId, barbershopId: SHOP_ID, specialty: 'Fade', bio: null }, OWNER_ID)

for (const { plan, limit } of PLANS) {
  test(`${plan} permite agregar barberos hasta el tope de ${limit}`, async () => {
    // Desde la barbería vacía hasta el último hueco disponible.
    for (let activeCount = 0; activeCount < limit; activeCount++) {
      escenario({ plan, activeCount })

      const creado = await agregar(`user-${activeCount}`)

      assert.strictEqual(
        creado.barbershopId,
        SHOP_ID,
        `${plan} debía aceptar el barbero nº ${activeCount + 1} de ${limit}`
      )
    }
  })

  test(`${plan} rechaza el barbero que supera el tope de ${limit}`, async () => {
    escenario({ plan, activeCount: limit })

    await assert.rejects(
      () => agregar(),
      (error) => {
        assert.match(error.message, new RegExp(`plan ${plan}`))
        // El mensaje le dice al dueño cuántos permite su plan, no solo que falló.
        assert.match(error.message, new RegExp(`${limit} barbero`))
        return true
      },
      `${plan} debía rechazar el barbero nº ${limit + 1}`
    )
  })
}

test('PREMIUM no impone tope de barberos', async () => {
  // Un número deliberadamente alto: con Infinity el servicio ni siquiera
  // consulta el conteo, así que ninguna cifra puede bloquear el alta.
  escenario({ plan: 'PREMIUM', activeCount: 500 })

  const creado = await agregar()

  assert.strictEqual(creado.barbershopId, SHOP_ID)
})

test('un plan desconocido cae al tope más restrictivo', async () => {
  // `BARBER_LIMITS[plan] ?? 1` es la red de seguridad para una barbería sin
  // plan válido: nunca debe abrir el cupo por defecto.
  escenario({ plan: 'PLAN_INEXISTENTE', activeCount: 1 })

  await assert.rejects(() => agregar(), /solo permite 1 barbero/)
})
