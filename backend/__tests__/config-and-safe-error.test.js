const test = require('node:test')
const assert = require('node:assert')

// Mismo doble de Prisma que mass-assignment.test.js: se siembra el require cache
// antes de pedir los servicios para que lib/prisma nunca abra un pg.Pool.
const prismaPath = require.resolve('../src/lib/prisma')

const db = { config: null, barbershop: null, ultimoUpsert: null, ultimoCreate: null }

const prisma = {
  barberShopConfig: {
    findUnique: async () => db.config,
    upsert: async (args) => {
      db.ultimoUpsert = args
      return { id: 'cfg-1', ...(db.config ? args.update : args.create) }
    },
    create: async ({ data }) => data,
    update: async ({ data }) => data,
  },
  barbershop: {
    findUnique: async () => db.barbershop,
    create: async ({ data }) => {
      db.ultimoCreate = data
      return { id: 'shop-nueva', ...data }
    },
  },
  $disconnect: async () => {},
}

require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prisma }

const configService = require('../src/services/config.service')
const barbershopService = require('../src/services/barbershop.service')
const { safeMessage, isPrismaError } = require('../src/utils/safeError')

const OWNER_ID = 'owner-1'

// ─── getConfig: defaults en vez de 404 ───────────────────────────────────────

test('getConfig devuelve los defaults del modelo cuando no hay fila', async () => {
  db.config = null

  const config = await configService.getConfig('shop-vieja')

  // Barbería El Roble: existe desde antes y nunca tuvo config.
  assert.strictEqual(config.barberPercentage, 60)
  assert.strictEqual(config.shopPercentage, 40)
  assert.strictEqual(config.loyaltyEnabled, true)
  assert.strictEqual(config.cutsForFreeService, 10)
  assert.strictEqual(config.appointmentDuration, 40)
  // isDefault avisa al panel que todavía no hay nada guardado.
  assert.strictEqual(config.isDefault, true)
})

test('getConfig no escribe nada cuando no hay fila', async () => {
  db.config = null
  db.ultimoUpsert = null

  await configService.getConfig('shop-vieja')

  // Un GET no debe crear filas.
  assert.strictEqual(db.ultimoUpsert, null)
})

test('getConfig devuelve la fila guardada si existe, sin isDefault', async () => {
  db.config = { id: 'cfg-1', barbershopId: 'shop-1', barberPercentage: 70, shopPercentage: 30 }

  const config = await configService.getConfig('shop-1')

  assert.strictEqual(config.barberPercentage, 70)
  assert.strictEqual(config.isDefault, undefined)
})

// ─── updateConfig: crea la fila en el primer guardado ────────────────────────

test('updateConfig crea la fila si la barbería no tenía config', async () => {
  db.barbershop = { id: 'shop-vieja', ownerId: OWNER_ID }
  db.config = null

  await configService.updateConfig('shop-vieja', { barberPercentage: 70, shopPercentage: 30 }, OWNER_ID)

  // Sin esto el dueño de El Roble podía leer la config pero no guardarla.
  assert.strictEqual(db.ultimoUpsert.create.barbershopId, 'shop-vieja')
  assert.strictEqual(db.ultimoUpsert.create.barberPercentage, 70)
  // Los campos que no mandó conservan el default del modelo.
  assert.strictEqual(db.ultimoUpsert.create.cutsForFreeService, 10)
})

test('updateConfig sigue exigiendo que los porcentajes sumen 100', async () => {
  db.barbershop = { id: 'shop-vieja', ownerId: OWNER_ID }
  db.config = null

  await assert.rejects(
    () => configService.updateConfig('shop-vieja', { barberPercentage: 70, shopPercentage: 50 }, OWNER_ID),
    /deben sumar 100/
  )
})

// ─── createBarbershop crea la config junto con la barbería ───────────────────

test('createBarbershop crea la config con los defaults en la misma operación', async () => {
  db.ultimoCreate = null

  await barbershopService.createBarbershop(
    { name: 'Estilo Centro', address: 'Calle 1', city: 'Villavicencio' },
    OWNER_ID
  )

  // create anidado = transacción implícita de Prisma: no puede quedar una
  // barbería sin su config.
  assert.deepStrictEqual(db.ultimoCreate.config, { create: {} })
})

// ─── safeMessage: no filtrar la estructura de la base ────────────────────────

test('safeMessage deja pasar los errores de dominio tal cual', () => {
  assert.strictEqual(safeMessage(new Error('Barbería no encontrada')), 'Barbería no encontrada')
  assert.strictEqual(safeMessage(new Error('No tienes permiso sobre esta barbería')), 'No tienes permiso sobre esta barbería')
})

test('safeMessage oculta el mensaje de un error de validación de Prisma', () => {
  const prismaError = new Error(
    'Invalid `prisma.service.create()` invocation:\n\n{\n  data: {\n    name: "Corte",\n    price: 25000,\n+   duration: Int\n  }\n}\n\nArgument `duration` is missing.'
  )
  prismaError.name = 'PrismaClientValidationError'
  prismaError.clientVersion = '5.0.0'

  const msg = safeMessage(prismaError)

  assert.strictEqual(msg, 'Faltan datos obligatorios o alguno tiene un formato incorrecto.')
  // Lo que motivó el arreglo: nada de la estructura de la tabla puede salir.
  assert.ok(!msg.includes('duration'))
  assert.ok(!msg.includes('prisma'))
  assert.ok(!msg.includes('Int'))
})

test('safeMessage traduce los códigos de Prisma más comunes', () => {
  const unique = Object.assign(new Error('Unique constraint failed on the fields: (`email`)'), {
    code: 'P2002', clientVersion: '5.0.0',
  })
  assert.strictEqual(safeMessage(unique), 'Ya existe un registro con esos datos.')

  const notFound = Object.assign(new Error('An operation failed because it depends on one or more records that were required but not found.'), {
    code: 'P2025', clientVersion: '5.0.0',
  })
  assert.strictEqual(safeMessage(notFound), 'No se encontró el registro solicitado.')
})

test('safeMessage cae en un mensaje genérico ante un Prisma desconocido', () => {
  const raro = Object.assign(new Error('algo muy interno con nombres de tabla'), {
    code: 'P9999', clientVersion: '5.0.0',
  })
  assert.strictEqual(safeMessage(raro), 'No se pudo completar la operación. Intenta de nuevo.')
})

test('isPrismaError distingue un Error normal de uno de Prisma', () => {
  assert.strictEqual(isPrismaError(new Error('Barbería no encontrada')), false)
  assert.strictEqual(isPrismaError(Object.assign(new Error('x'), { clientVersion: '5.0.0' })), true)
  assert.strictEqual(isPrismaError(null), false)
})
