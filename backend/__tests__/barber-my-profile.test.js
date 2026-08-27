const test = require('node:test')
const assert = require('node:assert')

// Mismo doble de Prisma que mass-assignment.test.js: se siembra el require cache
// antes de pedir los servicios para que lib/prisma nunca abra un pg.Pool.
const prismaPath = require.resolve('../src/lib/prisma')

const db = { barbero: null, usuario: null, ultimoFindUnique: null, ultimoFindFirst: null }

const prisma = {
  barber: {
    findUnique: async (args) => {
      db.ultimoFindUnique = args
      return db.barbero
    },
    findFirst: async () => db.barbero,
    count: async () => 0,
    create: async ({ data }) => data,
    update: async ({ data }) => data,
  },
  user: {
    findUnique: async () => db.usuario,
    findFirst: async (args) => {
      db.ultimoFindFirst = args
      return db.usuario
    },
    create: async ({ data }) => data,
    update: async ({ data }) => data,
  },
  termsAcceptance: { create: async ({ data }) => data },
  $disconnect: async () => {},
}

require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prisma }

const barberService = require('../src/services/barber.service')
const authService = require('../src/services/auth.service')

// ─── GET /api/barbers/my ─────────────────────────────────────────────────────

test('getMyBarberProfile busca por userId, no por el id del perfil', async () => {
  db.barbero = { id: 'perfil-1', userId: 'user-1', barbershopId: 'shop-1' }
  db.ultimoFindUnique = null

  await barberService.getMyBarberProfile('user-1')

  // El bug que arregla esta ruta era justamente confundir los dos ids.
  assert.deepStrictEqual(db.ultimoFindUnique.where, { userId: 'user-1' })
})

test('getMyBarberProfile devuelve el id del perfil y el del usuario por separado', async () => {
  db.barbero = { id: 'perfil-1', userId: 'user-1', barbershopId: 'shop-1' }

  const barber = await barberService.getMyBarberProfile('user-1')

  // /api/calendar|earnings|barber-card usan barber.id; /api/appointments/barber
  // usa barber.userId. Las pantallas necesitan los dos.
  assert.strictEqual(barber.id, 'perfil-1')
  assert.strictEqual(barber.userId, 'user-1')
})

test('getMyBarberProfile falla si el usuario no tiene perfil de barbero', async () => {
  db.barbero = null

  await assert.rejects(
    () => barberService.getMyBarberProfile('user-sin-perfil'),
    /No tienes perfil de barbero/
  )
})

test('getMyBarberProfile no expone la contraseña del usuario', async () => {
  db.barbero = { id: 'perfil-1', userId: 'user-1' }
  db.ultimoFindUnique = null

  await barberService.getMyBarberProfile('user-1')

  const camposUsuario = Object.keys(db.ultimoFindUnique.include.user.select)
  assert.ok(!camposUsuario.includes('password'))
  assert.deepStrictEqual(camposUsuario.sort(), ['avatar', 'email', 'id', 'name'])
})

// ─── GET /api/auth/find-by-email ─────────────────────────────────────────────

test('findUserByEmail devuelve solo id, nombre y rol', async () => {
  db.usuario = { id: 'user-9', name: 'Juan', role: 'BARBER' }
  db.ultimoFindFirst = null

  const res = await authService.findUserByEmail('juan@mail.com', 'owner-1')

  assert.strictEqual(res.found, true)
  // Nada de teléfono, ciudad, isVerified ni createdAt: el endpoint solo
  // responde "¿existe esta cuenta y sirve como barbero?".
  assert.deepStrictEqual(Object.keys(res.user).sort(), ['id', 'name', 'role'])
  const seleccionados = Object.keys(db.ultimoFindFirst.where ? db.ultimoFindFirst.select : {})
  assert.deepStrictEqual(seleccionados.sort(), ['id', 'name', 'role'])
})

test('findUserByEmail responde found:false en vez de lanzar cuando no existe', async () => {
  db.usuario = null

  const res = await authService.findUserByEmail('nadie@mail.com', 'owner-1')

  assert.deepStrictEqual(res, { found: false })
})

test('findUserByEmail busca sin distinguir mayúsculas', async () => {
  db.usuario = { id: 'user-9', name: 'Juan', role: 'BARBER' }
  db.ultimoFindFirst = null

  await authService.findUserByEmail('  Juan@Mail.com  ', 'owner-1')

  // register guarda el email tal cual lo escribió el usuario, así que una
  // búsqueda sensible a mayúsculas daría "no existe" con la cuenta ahí.
  assert.deepStrictEqual(db.ultimoFindFirst.where.email, {
    equals: 'Juan@Mail.com',
    mode: 'insensitive',
  })
})

test('findUserByEmail rechaza un email vacío', async () => {
  await assert.rejects(() => authService.findUserByEmail('   ', 'owner-1'), /Email requerido/)
})
