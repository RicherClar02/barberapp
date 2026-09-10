const test = require('node:test')
const assert = require('node:assert')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

const controller = require('../src/controllers/upload.controller')

const CONTROLLER_SRC = readFileSync(join(__dirname, '../src/controllers/upload.controller.js'), 'utf8')
const ROUTES_SRC = readFileSync(join(__dirname, '../src/routes/upload.routes.js'), 'utf8')

// --- La regresión que bloqueaba TODAS las subidas ------------------------

// uploadToCloudinary, extractPublicId y cloudinary se usaban en cinco lugares
// sin estar importados. El try/catch tragaba el ReferenceError y devolvía un
// 500 genérico, así que parecía un fallo de Cloudinary.
test('el controlador importa todo lo que usa', () => {
  for (const nombre of ['uploadToCloudinary', 'extractPublicId', 'cloudinary']) {
    const usado = new RegExp(`\\b${nombre}\\b`).test(CONTROLLER_SRC)
    const importado = new RegExp(`\\b${nombre}\\b[^\\n]*=[^\\n]*require|require[^\\n]*\\n?[^\\n]*\\b${nombre}\\b`).test(
      CONTROLLER_SRC.split('\n').filter(l => l.includes('require(')).join('\n')
    )
    assert.ok(usado, `${nombre} debería usarse`)
    assert.ok(importado, `${nombre} se usa pero no está importado`)
  }
})

// --- La ruta nueva --------------------------------------------------------

test('el controlador de avatar de usuario está exportado', () => {
  assert.equal(typeof controller.uploadUserAvatarController, 'function')
})

test('la ruta POST /user-avatar/:userId está registrada con auth y multer', () => {
  const linea = ROUTES_SRC.split('\n').find(l => l.includes("'/user-avatar/:userId'"))
  assert.ok(linea, 'no se encontró la ruta')
  assert.ok(linea.includes('router.post'), 'tiene que ser POST')
  assert.ok(linea.includes('authMiddleware'), 'no puede ser pública')
  assert.ok(linea.includes("uploadAvatar.single('file')"), 'el campo del archivo es "file"')
  assert.ok(linea.includes('uploadUserAvatarController'))
})

// No lleva requireRole: un CLIENT tiene que poder cambiar su propia foto, y
// ese es justamente el caso que barber-avatar no cubre.
test('la ruta no exige un rol: el permiso es "tu propia cuenta"', () => {
  const linea = ROUTES_SRC.split('\n').find(l => l.includes("'/user-avatar/:userId'"))
  assert.ok(!linea.includes('requireRole'), 'un cliente no puede quedar afuera')
})

// --- Permisos -------------------------------------------------------------

const resSpy = () => {
  const res = { code: null, body: null }
  res.status = function (c) { this.code = c; return this }
  res.json = function (b) { this.body = b; return this }
  return res
}

test('sin archivo responde 400 antes de tocar nada', async () => {
  const res = resSpy()
  await controller.uploadUserAvatarController(
    { file: null, params: { userId: 'u1' }, user: { id: 'u1', role: 'CLIENT' } },
    res
  )
  assert.equal(res.code, 400)
})

// El chequeo de permiso corre ANTES de cualquier consulta, así que se puede
// verificar sin base de datos.
test('un usuario no puede cambiarle la foto a otro', async () => {
  const res = resSpy()
  await controller.uploadUserAvatarController(
    { file: { buffer: Buffer.from('x') }, params: { userId: 'otro' }, user: { id: 'u1', role: 'CLIENT' } },
    res
  )
  assert.equal(res.code, 403)
  assert.equal(res.body.message, 'Sin permiso')
})

test('un OWNER tampoco puede cambiarle la foto a otro usuario', async () => {
  const res = resSpy()
  await controller.uploadUserAvatarController(
    { file: { buffer: Buffer.from('x') }, params: { userId: 'otro' }, user: { id: 'u1', role: 'OWNER' } },
    res
  )
  assert.equal(res.code, 403)
})

// --- Orden de las operaciones --------------------------------------------

// Si el avatar viejo se borrara antes de que el nuevo esté guardado y la
// subida fallara, el usuario se quedaría sin ninguna foto.
test('el avatar anterior se borra después de guardar el nuevo', () => {
  const cuerpo = CONTROLLER_SRC.slice(
    CONTROLLER_SRC.indexOf('const uploadUserAvatarController'),
    CONTROLLER_SRC.indexOf('const uploadServiceImageController')
  )
  const posSubida = cuerpo.indexOf('uploadToCloudinary')
  const posUpdate = cuerpo.indexOf('prisma.user.update')
  const posBorrado = cuerpo.indexOf('uploader.destroy')

  assert.ok(posSubida > -1 && posUpdate > -1 && posBorrado > -1)
  assert.ok(posSubida < posUpdate, 'primero se sube')
  assert.ok(posUpdate < posBorrado, 'el borrado del anterior va al final')
})

test('un fallo al borrar el avatar viejo no tumba la subida', () => {
  const cuerpo = CONTROLLER_SRC.slice(
    CONTROLLER_SRC.indexOf('const uploadUserAvatarController'),
    CONTROLLER_SRC.indexOf('const uploadServiceImageController')
  )
  const borrado = cuerpo.slice(cuerpo.indexOf('const anterior'))
  assert.ok(borrado.includes('try'), 'el borrado del anterior va en su propio try')
  assert.ok(borrado.includes('catch'))
})
