const test = require('node:test')
const assert = require('node:assert')
const bcrypt = require('bcryptjs')

// Mismo montaje que barber-limits.test.js: auth.service.js hace
// `require('../lib/prisma')` al cargarse y ese módulo abre un pg.Pool contra
// DATABASE_URL. Se siembra el require cache con un doble ANTES de pedir el
// servicio, así la suite corre sin base de datos.
//
// El doble guarda el usuario en memoria y `update` lo modifica de verdad, para
// que el test de "cambia y luego puedo loguearme" pase por el hash nuevo y no
// por un mock que devuelve lo que le convenga.
const prismaPath = require.resolve('../src/lib/prisma')

let usuario = null

const aplicarUpdate = (data) => {
  for (const [campo, valor] of Object.entries(data)) {
    // Prisma expresa el incremento como { increment: n }
    if (valor && typeof valor === 'object' && 'increment' in valor) {
      usuario[campo] = (usuario[campo] || 0) + valor.increment
    } else {
      usuario[campo] = valor
    }
  }
  return usuario
}

const prisma = {
  user: {
    findUnique: async ({ where }) => {
      if (!usuario) return null
      if (where.id && where.id !== usuario.id) return null
      if (where.email && where.email !== usuario.email) return null
      return { ...usuario }
    },
    update: async ({ data }) => aplicarUpdate(data),
  },
}

require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: prisma,
}

// login() firma un JWT al terminar; sin secreto lanzaría por una razón que no
// es la que se está probando.
process.env.JWT_SECRET = 'secreto-de-prueba'

const { changePassword, login } = require('../src/services/auth.service')

const EMAIL = 'duena@barberia.com'
const PASSWORD_ACTUAL = 'claveVieja123'

// Reconstruye el usuario antes de cada caso: los tests comparten el doble y uno
// que cambie la contraseña no puede filtrarse al siguiente.
const sembrarUsuario = async (overrides = {}) => {
  usuario = {
    id: 'user-1',
    name: 'Dueña',
    email: EMAIL,
    password: await bcrypt.hash(PASSWORD_ACTUAL, 10),
    role: 'CLIENT',
    isActive: true,
    isVerified: true,
    tokenVersion: 0,
    loginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  }
  return usuario
}

test('con la contraseña actual correcta la cambia y deja iniciar sesión con la nueva', async () => {
  await sembrarUsuario()
  const NUEVA = 'claveNueva456'

  const resultado = await changePassword(usuario.id, PASSWORD_ACTUAL, NUEVA)
  assert.match(resultado.message, /actualizada correctamente/)

  // El hash guardado corresponde a la nueva contraseña, no a la vieja.
  assert.ok(await bcrypt.compare(NUEVA, usuario.password), 'debía guardar el hash de la nueva contraseña')
  assert.ok(!(await bcrypt.compare(PASSWORD_ACTUAL, usuario.password)), 'la contraseña vieja no debía seguir sirviendo')

  // La prueba que le importa al usuario: puede volver a entrar con la nueva.
  const sesion = await login({ email: EMAIL, password: NUEVA })
  assert.ok(sesion.token, 'el login con la contraseña nueva debía devolver token')
  assert.strictEqual(sesion.user.email, EMAIL)

  // Y la vieja ya no sirve.
  await assert.rejects(
    () => login({ email: EMAIL, password: PASSWORD_ACTUAL }),
    /Credenciales incorrectas/
  )
})

test('la contraseña actual incorrecta se rechaza con 401 y su propio mensaje', async () => {
  await sembrarUsuario()
  const hashOriginal = usuario.password

  await assert.rejects(
    () => changePassword(usuario.id, 'no-es-mi-clave', 'claveNueva456'),
    (error) => {
      assert.strictEqual(error.status, 401, 'debía ser 401, no un 400 genérico')
      assert.match(error.message, /contraseña actual es incorrecta/i)
      // El mensaje no debe confundirse con el de la contraseña nueva.
      assert.doesNotMatch(error.message, /requisitos/i)
      return true
    }
  )

  assert.strictEqual(usuario.password, hashOriginal, 'un intento fallido no puede tocar la contraseña')
  assert.strictEqual(usuario.tokenVersion, 0, 'un intento fallido no puede invalidar las sesiones')
})

test('la contraseña nueva demasiado corta se rechaza con 400 y un mensaje distinto', async () => {
  await sembrarUsuario()
  const hashOriginal = usuario.password

  await assert.rejects(
    () => changePassword(usuario.id, PASSWORD_ACTUAL, 'abc'),
    (error) => {
      assert.strictEqual(error.status, 400, 'debía ser 400, no el 401 de credenciales')
      assert.match(error.message, /requisitos/i)
      // No puede sugerir que el problema fue la contraseña actual: es correcta.
      assert.doesNotMatch(error.message, /actual es incorrecta/i)
      return true
    }
  )

  assert.strictEqual(usuario.password, hashOriginal, 'una contraseña rechazada no puede haberse guardado')
})

test('la contraseña nueva que supera el máximo se rechaza', async () => {
  await sembrarUsuario()

  await assert.rejects(
    () => changePassword(usuario.id, PASSWORD_ACTUAL, 'a'.repeat(129)),
    (error) => {
      assert.strictEqual(error.status, 400)
      assert.match(error.message, /requisitos/i)
      return true
    }
  )
})

test('repetir la contraseña actual como nueva se rechaza', async () => {
  await sembrarUsuario()

  await assert.rejects(
    () => changePassword(usuario.id, PASSWORD_ACTUAL, PASSWORD_ACTUAL),
    (error) => {
      assert.strictEqual(error.status, 400)
      assert.match(error.message, /distinta de la actual/i)
      return true
    }
  )
})

test('una cuenta de Google/Facebook explica que no tiene contraseña que cambiar', async () => {
  // password null: la cuenta se creó por OAuth y nunca tuvo hash local.
  await sembrarUsuario({ password: null })

  await assert.rejects(
    () => changePassword(usuario.id, 'lo-que-sea', 'claveNueva456'),
    (error) => {
      assert.strictEqual(error.status, 400)
      assert.match(error.message, /Google o Facebook/)
      return true
    }
  )
})

test('el cambio invalida las sesiones anteriores subiendo tokenVersion', async () => {
  await sembrarUsuario({ tokenVersion: 3 })

  await changePassword(usuario.id, PASSWORD_ACTUAL, 'claveNueva456')

  // authMiddleware compara el tv del JWT contra este número: al subir, todos
  // los tokens emitidos antes del cambio dejan de servir.
  assert.strictEqual(usuario.tokenVersion, 4)
})

test('un usuario inexistente no revela nada más que 404', async () => {
  usuario = null

  await assert.rejects(
    () => changePassword('user-fantasma', PASSWORD_ACTUAL, 'claveNueva456'),
    (error) => {
      assert.strictEqual(error.status, 404)
      return true
    }
  )
})
