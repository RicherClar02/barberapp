const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

// /health es la herramienta de diagnóstico en producción. Si miente sobre un
// servicio no se puede confiar en lo que dice de los demás, así que cada
// entrada tiene que comprobar EXACTAMENTE la misma condición que usa la
// feature para decidir si puede trabajar.
//
// No se puede hacer require('../server.js'): arranca el servidor y se queda
// escuchando. Se revisa la fuente, que es donde vive el contrato.

const SERVER_SRC = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8')

const bloqueServices = () => {
  const inicio = SERVER_SRC.indexOf('services: {')
  assert.ok(inicio > -1, 'no se encontró el bloque services de /health')
  // El salto final se agrega a mano: la última entrada del bloque no lo trae
  // y la expresión de abajo lo usa como fin de línea.
  return SERVER_SRC.slice(inicio, SERVER_SRC.indexOf('\n    }', inicio)) + '\n'
}

const varsDe = (servicio) => {
  const bloque = bloqueServices()
  const re = new RegExp(`${servicio}:\\s*configured\\(([\\s\\S]*?)\\),?\\n`)
  const m = bloque.match(re)
  assert.ok(m, `${servicio} no usa el helper configured()`)
  return [...m[1].matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(x => x[1]).sort()
}

// Lo que cada servicio exige de verdad para poder trabajar.
const CONTRATO = {
  stripe: ['STRIPE_SECRET_KEY'],
  epayco: ['EPAYCO_API_KEY'],
  // notification.service.js: if (!TWILIO_SID || !TWILIO_TOKEN) return
  twilio: ['TWILIO_SID', 'TWILIO_TOKEN'],
  // notification.service.js: if (!FIREBASE_SERVER_KEY) return
  firebase: ['FIREBASE_SERVER_KEY'],
  // config/cloudinary.js pasa las tres a cloudinary.config()
  cloudinary: ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CLOUDINARY_CLOUD_NAME'],
  anthropic: ['ANTHROPIC_API_KEY'],
}

for (const [servicio, esperadas] of Object.entries(CONTRATO)) {
  test(`/health comprueba para ${servicio} las variables que ese servicio usa`, () => {
    assert.deepEqual(varsDe(servicio), [...esperadas].sort())
  })
}

// La regresión concreta: dos nombres que no lee nadie más en el backend, así
// que /health reportaba "not configured" con el servicio bien configurado.
test('/health no vuelve a mirar nombres que ningún servicio usa', () => {
  const bloque = bloqueServices()
  assert.ok(!bloque.includes('TWILIO_ACCOUNT_SID'), 'el servicio usa TWILIO_SID')
  assert.ok(!bloque.includes('FIREBASE_PROJECT_ID'), 'el servicio usa FIREBASE_SERVER_KEY')
})

// Toda variable nombrada en /health tiene que existir en otro lado del backend:
// si solo aparece acá, es un nombre inventado y el listado miente.
test('cada variable de /health la lee algún servicio de verdad', () => {
  const nombres = new Set(
    [...bloqueServices().matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(m => m[1])
  )

  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (['node_modules', 'generated'].includes(e.name)) continue
        walk(p, out)
      } else if (/\.js$/.test(e.name)) out.push(p)
    }
    return out
  }

  const fuera = walk(path.join(__dirname, '..', 'src'))
    .map(f => fs.readFileSync(f, 'utf8'))
    .join('\n')

  const huerfanas = [...nombres].filter(n => !fuera.includes(`process.env.${n}`)).sort()
  assert.deepEqual(huerfanas, [], `Solo /health las nombra: ${huerfanas.join(', ')}`)
})

// Con una variable a medias la feature falla igual; decir "configured" sería
// el mismo tipo de mentira, solo que más difícil de ver.
test('una variable vacía o en blanco no cuenta como configurada', () => {
  const helper = SERVER_SRC.match(/const configured = \(\.\.\.vars\) =>\s*\n?\s*(.+)/)
  assert.ok(helper, 'no se encontró el helper configured()')
  assert.ok(helper[1].includes('every'), 'tienen que estar TODAS, no alguna')
  assert.ok(helper[1].includes('trim'), 'una variable en blanco no está configurada')
})
