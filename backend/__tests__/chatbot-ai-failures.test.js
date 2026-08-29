const test = require('node:test')
const assert = require('node:assert')

const {
  classifyAiError,
  AI_FAILURE,
  AI_FAILURE_REPLY,
} = require('../src/services/chatbot.service')

// Con la key puesta, para aislar la clasificación del chequeo de configuración.
const conKey = (fn) => {
  const previa = process.env.ANTHROPIC_API_KEY
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
  try {
    fn()
  } finally {
    if (previa === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = previa
  }
}

const sinKey = (fn) => {
  const previa = process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  try {
    fn()
  } finally {
    if (previa !== undefined) process.env.ANTHROPIC_API_KEY = previa
  }
}

const conStatus = (status, message = '') => Object.assign(new Error(message), { status })

test('sin ANTHROPIC_API_KEY todo error se clasifica como problema de configuración', () => {
  sinKey(() => {
    assert.strictEqual(classifyAiError(new Error('lo que sea')), AI_FAILURE.CONFIG)
    assert.strictEqual(classifyAiError(conStatus(429, 'rate limit')), AI_FAILURE.CONFIG)
  })
})

test('los créditos agotados son configuración, no un error genérico', () => {
  conKey(() => {
    assert.strictEqual(
      classifyAiError(conStatus(400, 'Your credit balance is too low to access the API')),
      AI_FAILURE.CONFIG
    )
  })
})

test('key inválida o no autorizada es configuración', () => {
  conKey(() => {
    assert.strictEqual(classifyAiError(conStatus(401, 'invalid x-api-key')), AI_FAILURE.CONFIG)
    assert.strictEqual(classifyAiError(conStatus(403, 'forbidden')), AI_FAILURE.CONFIG)
  })
})

test('el 429 es límite de uso, distinto de configuración', () => {
  conKey(() => {
    assert.strictEqual(classifyAiError(conStatus(429, 'Number of requests')), AI_FAILURE.RATE_LIMIT)
    assert.strictEqual(classifyAiError(new Error('rate limit exceeded')), AI_FAILURE.RATE_LIMIT)
  })
})

test('un fallo inesperado cae en genérico', () => {
  conKey(() => {
    assert.strictEqual(classifyAiError(new TypeError('boom')), AI_FAILURE.GENERIC)
    assert.strictEqual(classifyAiError(conStatus(500, 'overloaded')), AI_FAILURE.GENERIC)
  })
})

// El bug original: https se usaba sin importar, el ReferenceError caía en un
// catch mudo y el cliente recibía la misma disculpa que en cualquier otro caso.
test('un ReferenceError es genérico, no se confunde con falta de créditos', () => {
  conKey(() => {
    assert.strictEqual(
      classifyAiError(new ReferenceError('https is not defined')),
      AI_FAILURE.GENERIC
    )
  })
})

test('los tres motivos tienen mensajes distintos y el de configuración manda al flujo manual', () => {
  const mensajes = Object.values(AI_FAILURE).map(m => AI_FAILURE_REPLY[m])

  assert.strictEqual(new Set(mensajes).size, 3, 'los tres mensajes deben ser distintos')
  assert.ok(mensajes.every(m => typeof m === 'string' && m.length > 0))
  assert.match(AI_FAILURE_REPLY[AI_FAILURE.CONFIG], /reservar/i)
})

test('el servicio del chatbot importa https (el bug de arranque)', () => {
  const fuente = require('fs').readFileSync(
    require.resolve('../src/services/chatbot.service'),
    'utf8'
  )

  assert.match(fuente, /require\(['"]https['"]\)/)
})
