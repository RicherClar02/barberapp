const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const SRC = path.join(__dirname, '..', 'src')

// Un identificador usado sin importar ni declarar es un ReferenceError que solo
// aparece cuando esa rama se ejecuta. Como casi siempre está dentro de un try,
// sale como un 500 genérico y no como el error que es. Ya pasó tres veces:
// https en chatbot.service.js, tres nombres en upload.controller.js, y
// logSuspiciousIp / sendWhatsApp / sendPushNotification en este barrido.
//
// El barrido completo NO vive acá: detectar esto de verdad necesita análisis de
// alcance (ESLint no-undef), no expresiones regulares — un intento por regex
// marca "async" y los parámetros de callback como si fueran llamadas sueltas.
// Lo que este archivo fija es la regresión concreta de los cuatro archivos que
// ya fallaron, que es barato y no da falsos positivos.

const soloCodigo = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')

// Lo que el archivo trae a su propio alcance de módulo por require.
const nombresImportados = (src) => {
  const nombres = new Set()
  for (const linea of src.split('\n')) {
    if (!linea.includes('require(')) continue
    const destructurado = linea.match(/(?:const|let|var)\s*\{([^}]*)\}\s*=/)
    if (destructurado) {
      for (const raw of destructurado[1].split(',')) {
        const partes = raw.trim().split(':')
        const nombre = (partes[1] || partes[0]).trim()
        if (nombre) nombres.add(nombre)
      }
      continue
    }
    const simple = linea.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/)
    if (simple) nombres.add(simple[1])
  }
  return nombres
}

test('los archivos que ya fallaron importan lo que usan', () => {
  const casos = [
    ['services/waitlist.service.js', ['sendWhatsApp', 'sendPushNotification']],
    ['services/fraud.service.js', ['logSuspiciousIp']],
    ['controllers/upload.controller.js', ['uploadToCloudinary', 'extractPublicId', 'cloudinary']],
    ['services/chatbot.service.js', ['https']],
  ]

  for (const [rel, nombres] of casos) {
    const src = soloCodigo(fs.readFileSync(path.join(SRC, rel), 'utf8'))
    const importados = nombresImportados(src)
    for (const nombre of nombres) {
      assert.ok(importados.has(nombre), `src/${rel} usa "${nombre}" sin importarlo`)
    }
  }
})

// Los cuatro nombres del último barrido, comprobados también por su uso real:
// si alguien borra la llamada, el caso de arriba dejaría de tener sentido y
// este avisa que hay que actualizarlo.
test('las funciones recién importadas se siguen usando donde hacían falta', () => {
  const waitlist = soloCodigo(fs.readFileSync(path.join(SRC, 'services/waitlist.service.js'), 'utf8'))
  assert.ok(/sendWhatsApp\(/.test(waitlist))
  assert.ok(/sendPushNotification\(/.test(waitlist))

  const fraud = soloCodigo(fs.readFileSync(path.join(SRC, 'services/fraud.service.js'), 'utf8'))
  assert.equal((fraud.match(/logSuspiciousIp\(/g) || []).length, 2, 'las dos ramas de fraude lo registran')
})

// notifyNextInWaitlist corta antes de marcar NOTIFIED y de crear la
// notificación: mientras el ReferenceError estuvo ahí, ninguna entrada de la
// lista de espera avanzó nunca. El orden importa, así que queda fijado.
test('la lista de espera avisa antes de marcar la entrada como notificada', () => {
  const src = soloCodigo(fs.readFileSync(path.join(SRC, 'services/waitlist.service.js'), 'utf8'))
  const fn = src.slice(src.indexOf('const notifyNextInWaitlist'))

  const posAviso = fn.indexOf('sendPushNotification(')
  const posNotificacion = fn.indexOf('prisma.notification.create')
  const posMarca = fn.indexOf("status: 'NOTIFIED'")

  assert.ok(posAviso > -1 && posNotificacion > -1 && posMarca > -1)
  assert.ok(posAviso < posNotificacion, 'primero se avisa')
  assert.ok(posNotificacion < posMarca, 'y la entrada se marca al final')
})
