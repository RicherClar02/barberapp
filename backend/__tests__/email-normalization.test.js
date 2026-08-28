const test = require('node:test')
const assert = require('node:assert')

// register emite un JWT para las cuentas CLIENT (que nacen verificadas), así que
// jsonwebtoken necesita un secreto aunque el token no se inspeccione acá.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-tests-'.padEnd(40, 'x')

// Mismo doble de Prisma que mass-assignment.test.js: se siembra el require cache
// antes de pedir los servicios para que lib/prisma nunca abra un pg.Pool.
const prismaPath = require.resolve('../src/lib/prisma')

// La "base" indexa por email exacto, igual que la columna @unique real: si el
// servicio busca sin normalizar, acá no encuentra nada. Esa es justamente la
// condición que reproducen los dos escenarios de abajo.
const db = { usuarios: new Map(), ultimoWhere: null }

const buscarPorEmail = (where) => {
  db.ultimoWhere = where
  if (typeof where.email === 'string') return db.usuarios.get(where.email) || null
  return null
}

const prisma = {
  user: {
    findUnique: async ({ where }) => (where.email !== undefined ? buscarPorEmail(where) : null),
    findFirst: async ({ where }) => (where.email !== undefined ? buscarPorEmail(where) : null),
    create: async ({ data }) => {
      const u = { id: 'user-nuevo', tokenVersion: 0, ...data }
      db.usuarios.set(data.email, u)
      return u
    },
    update: async ({ data }) => ({ id: 'user-1', ...data }),
  },
  termsAcceptance: { create: async ({ data }) => data },
  $disconnect: async () => {},
}

require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prisma }

const authService = require('../src/services/auth.service')
const { normalizeEmail } = require('../src/utils/email')

const sembrar = (email, extra = {}) => {
  db.usuarios.clear()
  const u = {
    id: 'user-1', name: 'María Gómez', email, role: 'BARBER',
    isVerified: true, isActive: true, tokenVersion: 0, ...extra,
  }
  db.usuarios.set(email, u)
  return u
}

// ─── El normalizador ─────────────────────────────────────────────────────────

test('normalizeEmail aplica la misma regla con la que se guardaron los usuarios', () => {
  assert.strictEqual(normalizeEmail('Juan.Perez+tienda@Gmail.com'), 'juanperez@gmail.com')
  assert.strictEqual(normalizeEmail('juan@googlemail.com'), 'juan@gmail.com')
  assert.strictEqual(normalizeEmail('juan+tag@hotmail.com'), 'juan@hotmail.com')
  // Fuera de Gmail los puntos se conservan; solo baja a minúsculas.
  assert.strictEqual(normalizeEmail('Juan.Perez@empresa.com.co'), 'juan.perez@empresa.com.co')
})

test('normalizeEmail recorta espacios antes de normalizar', () => {
  // validator.normalizeEmail no hace trim por su cuenta: sin el trim previo
  // devolvería 'juan@gmail.com  ' con los espacios pegados.
  assert.strictEqual(normalizeEmail('  JUAN@GMAIL.COM  '), 'juan@gmail.com')
})

test('normalizeEmail deja la basura intacta en vez de inventar un email', () => {
  // validator.normalizeEmail('basura') devuelve '@basura'. Sin la guarda de
  // isEmail se buscaría ese string en la base.
  assert.strictEqual(normalizeEmail('basura'), 'basura')
  assert.strictEqual(normalizeEmail(''), '')
  assert.strictEqual(normalizeEmail(null), '')
})

test('normalizeEmail es idempotente', () => {
  const una = normalizeEmail('Juan.Perez+tienda@Gmail.com')
  assert.strictEqual(normalizeEmail(una), una)
})

// ─── ESCENARIO A: recuperación con un Gmail con puntos ───────────────────────
// María se registró con maria.gomez@gmail.com; quedó guardada como
// mariagomez@gmail.com. Antes, /forgot-password normalizaba (tenía validador)
// pero /verify-reset-code no: el código le llegaba al correo y al escribirlo el
// sistema respondía "Código inválido o expirado". Quedaba sin poder recuperar
// la cuenta y sin ninguna pista de que el problema era el punto.

test('ESCENARIO A: forgotPassword encuentra a María escribiendo el correo con puntos', async () => {
  sembrar('mariagomez@gmail.com')

  const res = await authService.forgotPassword('maria.gomez@gmail.com')

  assert.strictEqual(db.ultimoWhere.email, 'mariagomez@gmail.com')
  assert.match(res.message, /recibirás un código/i)
})

test('ESCENARIO A: verifyResetCode acepta el mismo correo con puntos', async () => {
  // Token vigente: si el email no se normalizara, no se encontraría la fila y el
  // fallo sería "Código inválido o expirado" en vez de llegar a comparar el code.
  sembrar('mariagomez@gmail.com', {
    resetToken: 'hash-del-codigo',
    resetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
  })

  await assert.rejects(
    () => authService.verifyResetCode('maria.gomez@gmail.com', '123456'),
    (err) => {
      // Falla por el código, que es lo correcto: el hash no coincide.
      // Lo que NO puede pasar es que falle por no encontrar al usuario.
      assert.strictEqual(db.ultimoWhere.email, 'mariagomez@gmail.com')
      assert.doesNotMatch(err.message, /expirado/)
      return true
    }
  )
})

test('ESCENARIO A: resetPassword busca por el correo normalizado', async () => {
  sembrar('mariagomez@gmail.com', {
    resetToken: 'hash-del-codigo',
    resetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
  })

  await authService.resetPassword('maria.gomez@gmail.com', '123456', 'NuevaClave123').catch(() => {})

  assert.strictEqual(db.ultimoWhere.email, 'mariagomez@gmail.com')
})

test('ESCENARIO A: los tres pasos del flujo buscan exactamente el mismo email', async () => {
  const vistos = []
  sembrar('mariagomez@gmail.com', {
    resetToken: 'hash', resetTokenExpiry: new Date(Date.now() + 600000),
  })

  await authService.forgotPassword('Maria.Gomez@Gmail.com')
  vistos.push(db.ultimoWhere.email)
  await authService.verifyResetCode('maria.gomez+viejo@gmail.com', '123456').catch(() => {})
  vistos.push(db.ultimoWhere.email)
  await authService.resetPassword('MARIA.GOMEZ@GMAIL.COM', '123456', 'X').catch(() => {})
  vistos.push(db.ultimoWhere.email)

  // Cuatro formas distintas de escribirlo, un solo email consultado. Este es el
  // invariante que se rompía cuando la regla vivía en los validadores de ruta.
  assert.deepStrictEqual(vistos, [
    'mariagomez@gmail.com', 'mariagomez@gmail.com', 'mariagomez@gmail.com',
  ])
})

// ─── ESCENARIO B: alta de barbero con el correo escrito con +tag ─────────────
// Carlos se registró con carlos.ramirez+trabajo@gmail.com; quedó guardado como
// carlosramirez@gmail.com. Le dicta al dueño la forma larga. Antes,
// find-by-email solo comparaba sin distinguir mayúsculas, así que respondía
// "no existe" y mandaba a Carlos a registrarse de nuevo — donde register sí
// normalizaba y contestaba "el correo ya está registrado". Bucle sin salida.

test('ESCENARIO B: find-by-email encuentra a Carlos con el correo dictado con +tag', async () => {
  sembrar('carlosramirez@gmail.com', { id: 'user-7', name: 'Carlos Ramírez', role: 'BARBER' })

  const res = await authService.findUserByEmail('carlos.ramirez+trabajo@gmail.com', 'owner-1')

  assert.strictEqual(res.found, true)
  assert.strictEqual(res.user.id, 'user-7')
  assert.strictEqual(res.user.role, 'BARBER')
  assert.strictEqual(db.ultimoWhere.email, 'carlosramirez@gmail.com')
})

test('ESCENARIO B: find-by-email sigue diciendo found:false si de verdad no existe', async () => {
  sembrar('carlosramirez@gmail.com')

  const res = await authService.findUserByEmail('otro.distinto@gmail.com', 'owner-1')

  assert.deepStrictEqual(res, { found: false })
})

test('ESCENARIO B: register y find-by-email coinciden en la fila que tocan', async () => {
  db.usuarios.clear()

  await authService.register({
    name: 'Carlos Ramírez',
    email: 'Carlos.Ramirez+trabajo@Gmail.com',
    password: 'hash',
    role: 'BARBER',
  })
  const guardado = [...db.usuarios.keys()][0]

  const res = await authService.findUserByEmail('carlos.ramirez@googlemail.com', 'owner-1')

  // La contradicción que veía el dueño: register decía "ya está registrado" y
  // find-by-email decía "no existe". Ahora las dos rutas resuelven al mismo email.
  assert.strictEqual(guardado, 'carlosramirez@gmail.com')
  assert.strictEqual(res.found, true)
})

// ─── Login y registro, la base del circuito ──────────────────────────────────

test('register guarda el email normalizado', async () => {
  db.usuarios.clear()

  await authService.register({ name: 'Juan', email: '  Juan.Perez+x@Gmail.com ', password: 'h' })

  assert.deepStrictEqual([...db.usuarios.keys()], ['juanperez@gmail.com'])
})

test('login busca por el email normalizado', async () => {
  sembrar('juanperez@gmail.com', { password: null })

  await authService.login({ email: 'Juan.Perez+x@Gmail.com', password: 'loquesea' }).catch(() => {})

  assert.strictEqual(db.ultimoWhere.email, 'juanperez@gmail.com')
})
