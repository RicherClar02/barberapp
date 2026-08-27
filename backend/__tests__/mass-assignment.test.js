const test = require('node:test')
const assert = require('node:assert')

// Mismo doble de Prisma que barber-limits.test.js: se siembra el require cache
// antes de pedir los servicios para que lib/prisma nunca abra un pg.Pool.
const prismaPath = require.resolve('../src/lib/prisma')

// Almacén de mentira. `update` aplica los campos recibidos sobre la fila, así
// que consultar `db.fila` después de la llamada responde de verdad a la
// pregunta "¿cambió el valor guardado?" en lugar de solo mirar el payload.
const db = { fila: null, ultimoCreate: null }

const almacen = () => ({
  findUnique: async () => db.fila,
  findFirst: async () => null,
  count: async () => 0,
  create: async ({ data }) => {
    db.ultimoCreate = data
    db.fila = { id: 'fila-nueva', ...data }
    return db.fila
  },
  update: async ({ data }) => {
    Object.assign(db.fila, data)
    return db.fila
  }
})

const prisma = {
  barbershop: almacen(),
  service: almacen(),
  barber: almacen(),
  user: almacen(),
  advertisement: almacen(),
  subscription: almacen(),
  offer: almacen(),
  notification: almacen(),
  appointment: almacen(),
  waitlist: almacen(),
  review: almacen(),
  schedule: almacen(),
  barberShopConfig: almacen(),
  notificationPreference: almacen(),
  loyaltyPoint: almacen(),
  clientLoyalty: almacen(),
  searchLog: almacen(),
  chatMessage: almacen(),
  termsAcceptance: almacen(),
  shopPhoto: almacen(),
  payment: almacen(),
  $queryRawUnsafe: async () => [],
  $disconnect: async () => {}
}

require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prisma }

const barbershopService = require('../src/services/barbershop.service')
const serviceService = require('../src/services/service.service')
const barberService = require('../src/services/barber.service')

const OWNER_ID = 'owner-1'
const INTRUSO_ID = 'owner-2'

test('createBarbershop descarta plan, isFeatured, isVerified y ownerId ajeno', async () => {
  db.fila = null
  db.ultimoCreate = null

  const creada = await barbershopService.createBarbershop({
    name: 'Estilo Centro',
    address: 'Calle 1',
    city: 'Villavicencio',
    // Campos prohibidos que el cliente intenta colar:
    plan: 'PREMIUM',
    planExpiresAt: new Date('2099-01-01'),
    isFeatured: true,
    isVerified: true,
    ownerId: INTRUSO_ID
  }, OWNER_ID)

  // Ninguno llega al create: al no enviarse, Prisma aplica sus @default.
  for (const prohibido of ['plan', 'planExpiresAt', 'isFeatured', 'isVerified']) {
    assert.ok(
      !(prohibido in db.ultimoCreate),
      `${prohibido} no debía llegar al create`
    )
  }
  // ownerId sí se escribe, pero con el del token, no con el del body.
  assert.strictEqual(creada.ownerId, OWNER_ID)
  // Y lo legítimo sí pasa.
  assert.strictEqual(creada.name, 'Estilo Centro')
})

test('updateBarbershop ignora plan y ownerId y no altera el valor guardado', async () => {
  db.fila = {
    id: 'shop-1',
    name: 'Estilo Centro',
    ownerId: OWNER_ID,
    plan: 'BASIC',
    isFeatured: false,
    isVerified: false,
    isVisible: true,
    isActive: true
  }

  await barbershopService.updateBarbershop('shop-1', {
    name: 'Estilo Centro Renovado',
    plan: 'PREMIUM',
    isFeatured: true,
    isVerified: true,
    isVisible: false,
    isActive: false,
    ownerId: INTRUSO_ID
  }, OWNER_ID)

  assert.strictEqual(db.fila.plan, 'BASIC', 'el plan guardado no debía cambiar')
  assert.strictEqual(db.fila.ownerId, OWNER_ID, 'la barbería no debía cambiar de dueño')
  assert.strictEqual(db.fila.isFeatured, false)
  assert.strictEqual(db.fila.isVerified, false)
  assert.strictEqual(db.fila.isVisible, true)
  assert.strictEqual(db.fila.isActive, true)
  assert.strictEqual(db.fila.name, 'Estilo Centro Renovado', 'el campo permitido sí debía aplicarse')
})

test('createService descarta campos ajenos al catálogo', async () => {
  db.fila = { id: 'shop-1', ownerId: OWNER_ID }
  db.ultimoCreate = null

  await serviceService.createService({
    barbershopId: 'shop-1',
    name: 'Corte clásico',
    price: 25000,
    duration: 30,
    id: 'id-elegido-por-el-cliente',
    createdAt: new Date('2000-01-01')
  }, OWNER_ID)

  assert.ok(!('id' in db.ultimoCreate), 'el cliente no debe fijar el id')
  assert.ok(!('createdAt' in db.ultimoCreate), 'el cliente no debe fijar createdAt')
  assert.strictEqual(db.ultimoCreate.price, 25000)
})

test('updateService ignora barbershopId y no mueve el servicio de barbería', async () => {
  db.fila = {
    id: 'srv-1',
    barbershopId: 'shop-1',
    name: 'Corte clásico',
    price: 25000,
    barbershop: { ownerId: OWNER_ID }
  }

  await serviceService.updateService('srv-1', {
    price: 30000,
    barbershopId: 'shop-del-intruso'
  }, OWNER_ID)

  assert.strictEqual(db.fila.barbershopId, 'shop-1', 'el servicio no debía migrar de barbería')
  assert.strictEqual(db.fila.price, 30000, 'el precio sí es editable por el dueño')
})

test('updateBarber ignora userId y barbershopId', async () => {
  db.fila = {
    id: 'barber-1',
    userId: 'user-1',
    barbershopId: 'shop-1',
    isActive: true,
    specialty: 'Fade',
    barbershop: { ownerId: OWNER_ID, plan: 'BASIC' }
  }

  await barberService.updateBarber('barber-1', {
    specialty: 'Barba',
    userId: 'user-del-intruso',
    barbershopId: 'shop-del-intruso'
  }, OWNER_ID)

  assert.strictEqual(db.fila.userId, 'user-1', 'el perfil no debía reasignarse a otra persona')
  assert.strictEqual(db.fila.barbershopId, 'shop-1', 'el barbero no debía migrar de barbería')
  assert.strictEqual(db.fila.specialty, 'Barba')
})

test('updateBarber revalida el tope del plan al reactivar un barbero', async () => {
  // BASIC permite 2. El barbero está inactivo y ya hay 2 activos, así que
  // reactivarlo dejaría 3: es la vía por la que antes se evadía el tope.
  db.fila = {
    id: 'barber-3',
    userId: 'user-3',
    barbershopId: 'shop-1',
    isActive: false,
    barbershop: { ownerId: OWNER_ID, plan: 'BASIC' }
  }
  prisma.barber.count = async () => 2

  await assert.rejects(
    () => barberService.updateBarber('barber-3', { isActive: true }, OWNER_ID),
    /plan BASIC solo permite 2 barbero/
  )
  assert.strictEqual(db.fila.isActive, false, 'el barbero debía seguir inactivo')

  // Con un cupo libre la reactivación sí procede.
  prisma.barber.count = async () => 1
  await barberService.updateBarber('barber-3', { isActive: true }, OWNER_ID)
  assert.strictEqual(db.fila.isActive, true)

  prisma.barber.count = async () => 0
})

test('POST /subscriptions responde 403 a un OWNER y deja pasar a un ADMIN', async () => {
  const router = require('../src/routes/subscription.routes')

  const capa = router.stack.find(
    (l) => l.route && l.route.path === '/' && l.route.methods.post
  )
  assert.ok(capa, 'no se encontró la ruta POST / en subscription.routes')

  // La cadena es [authMiddleware, requireRole(...), createController]. Se
  // ejecuta el guard de rol tal como quedó montado en la ruta, sin reconstruirlo.
  const guard = capa.route.stack[1].handle

  const responder = () => {
    const res = { statusCode: null, body: null }
    res.status = (code) => { res.statusCode = code; return res }
    res.json = (payload) => { res.body = payload; return res }
    return res
  }

  const resOwner = responder()
  let ownerPaso = false
  guard({ user: { role: 'OWNER' } }, resOwner, () => { ownerPaso = true })

  assert.strictEqual(resOwner.statusCode, 403, 'un OWNER no debe poder crear suscripciones')
  assert.strictEqual(ownerPaso, false, 'la petición del OWNER no debía llegar al controller')

  const resAdmin = responder()
  let adminPaso = false
  guard({ user: { role: 'ADMIN' } }, resAdmin, () => { adminPaso = true })

  assert.strictEqual(adminPaso, true, 'un ADMIN sí debe poder crear suscripciones')
  assert.strictEqual(resAdmin.statusCode, null)
})
