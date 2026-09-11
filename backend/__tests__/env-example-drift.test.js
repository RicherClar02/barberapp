const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const BACKEND = path.join(__dirname, '..')

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'generated', 'logs', '.git', '__tests__'].includes(entry.name)) continue
      walk(p, out)
    } else if (/\.(js|ts)$/.test(entry.name)) {
      out.push(p)
    }
  }
  return out
}

// Toda variable que el backend lee de verdad, con dónde la lee.
const leidas = () => {
  const encontradas = new Map()
  for (const file of walk(BACKEND)) {
    const src = fs.readFileSync(file, 'utf8')
    const rel = path.relative(BACKEND, file).split(path.sep).join('/')
    const re = /process\.env\.([A-Z0-9_]+)|process\.env\[\s*['"]([A-Z0-9_]+)['"]\s*\]/g
    for (const m of src.matchAll(re)) {
      const name = m[1] || m[2]
      if (!encontradas.has(name)) encontradas.set(name, new Set())
      encontradas.get(name).add(rel)
    }
  }
  return encontradas
}

const documentadas = () =>
  new Set(
    fs.readFileSync(path.join(BACKEND, '.env.example'), 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => l.split('=')[0].trim())
      .filter(Boolean)
  )

test('toda variable que el backend lee está en .env.example', () => {
  const usadas = leidas()
  const enEjemplo = documentadas()

  const sinDocumentar = [...usadas.keys()]
    .filter(n => !enEjemplo.has(n))
    .sort()

  assert.deepEqual(
    sinDocumentar,
    [],
    `Estas variables se leen pero nadie las documentó: ${sinDocumentar.join(', ')}`
  )
})

test('.env.example no documenta variables que ya nadie lee', () => {
  const usadas = leidas()
  const sobrantes = [...documentadas()].filter(n => !usadas.has(n)).sort()
  assert.deepEqual(sobrantes, [], `Sobran en .env.example: ${sobrantes.join(', ')}`)
})

// Las tres que se documentaron en este barrido tienen un valor por defecto en
// el código, así que faltar no rompe nada de forma visible: cambia el
// comportamiento en silencio. Por eso son las que más importaba documentar.
test('las variables con default silencioso están documentadas', () => {
  const enEjemplo = documentadas()
  for (const nombre of ['SHOP_TIMEZONE', 'PUBLIC_WEB_URL', 'ADMIN_PASSWORD']) {
    assert.ok(enEjemplo.has(nombre), `${nombre} debería estar en .env.example`)
  }
})

// .env.example se commitea; el .env real no.
test('.env.example no trae secretos de verdad', () => {
  const src = fs.readFileSync(path.join(BACKEND, '.env.example'), 'utf8')
  const sospechosos = [
    /sk_live_/i,
    /AIza[0-9A-Za-z_-]{30,}/,
    /sk-ant-[0-9A-Za-z_-]{20,}/,
    /postgresql:\/\/[^\s:]+:[^\s@]{12,}@(?!localhost)/,
  ]
  for (const re of sospechosos) {
    assert.ok(!re.test(src), `.env.example parece traer un secreto real (${re})`)
  }
})
