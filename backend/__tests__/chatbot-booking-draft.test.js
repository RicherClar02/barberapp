const test = require('node:test')
const assert = require('node:assert')

const {
  mergeDraft,
  isDraftStale,
  isDraftComplete,
  draftChangedFields,
  resolveTurnValues,
  buildDraftSummary,
  missingDraftPrompt,
  claimsBookingHappened,
  DRAFT_TTL_MINUTES,
  DRAFT_INTENTS,
  DRAFT_CLEARING_INTENTS,
} = require('../src/services/chatbot.service')

// Contexto mínimo de barbería, con dos "Ricardo" para ejercitar la ambigüedad.
const ctx = {
  services: [
    { id: 'svc-1', name: 'Corte clásico', price: 25000, duration: 30 },
    { id: 'svc-2', name: 'Barba', price: 15000, duration: 20 },
  ],
  barbers: [
    { id: 'brb-1', name: 'Ricardo Gómez', specialty: 'Fades', rating: 4.9 },
    { id: 'brb-2', name: 'Juan Ramírez', specialty: 'Clásicos', rating: 4.7 },
  ],
}

// El contexto con dos Ricardo se arma aparte para no volver ambiguo todo el archivo.
const ctxDosRicardos = {
  services: ctx.services,
  barbers: [
    { id: 'brb-1', name: 'Ricardo Gómez', specialty: 'Fades', rating: 4.9 },
    { id: 'brb-3', name: 'Ricardo Peña', specialty: 'Barba', rating: 4.5 },
  ],
}

// --- El caso reportado --------------------------------------------------

// Turno 1: el cliente da servicio y fecha. Turno 2: dice solo "Ricardo".
// Antes esto no creaba nada: la compuerta exigía los cuatro datos en una sola
// respuesta del modelo y "Ricardo" a secas dejaba los otros tres en null.
test('dos turnos parciales completan el borrador: servicio + fecha, luego "Ricardo"', async () => {
  // Turno 1
  const t1 = await resolveTurnValues(
    { serviceName: 'Corte clásico', date: '2026-09-11', time: '15:30' },
    'shop-1',
    ctx
  )
  assert.equal(t1.clarify, null)
  const draft1 = mergeDraft(null, t1.values)

  assert.equal(draft1.serviceId, 'svc-1')
  assert.equal(draft1.date, '2026-09-11')
  assert.equal(draft1.startTime, '15:30')
  assert.equal(draft1.barberId, null)
  assert.ok(!isDraftComplete(draft1), 'todavía falta el barbero')

  // Turno 2: solo el barbero, los otros tres en null como los emite el modelo
  const t2 = await resolveTurnValues(
    { barberName: 'Ricardo', serviceName: null, date: null, time: null },
    'shop-1',
    ctx
  )
  assert.equal(t2.clarify, null)
  const draft2 = mergeDraft(draft1, t2.values)

  assert.equal(draft2.barberId, 'brb-1')
  assert.equal(draft2.barberName, 'Ricardo Gómez')
  // Lo del turno anterior sobrevivió: ahí está todo el arreglo.
  assert.equal(draft2.serviceId, 'svc-1')
  assert.equal(draft2.date, '2026-09-11')
  assert.equal(draft2.startTime, '15:30')
  assert.ok(isDraftComplete(draft2), 'el borrador quedó completo')
})

// --- Merge ---------------------------------------------------------------

test('un turno sin datos no borra lo guardado', () => {
  const stored = {
    serviceId: 'svc-1', serviceName: 'Corte clásico',
    barberId: 'brb-1', barberName: 'Ricardo Gómez',
    date: '2026-09-11', startTime: '15:30',
  }
  const merged = mergeDraft(stored, {})
  assert.deepEqual(merged, stored)
})

test('un valor nuevo pisa al guardado: "mejor el jueves"', () => {
  const stored = { serviceId: 'svc-1', serviceName: 'Corte clásico', barberId: 'brb-1', barberName: 'Ricardo Gómez', date: '2026-09-11', startTime: '15:30' }
  const merged = mergeDraft(stored, { date: '2026-09-10' })
  assert.equal(merged.date, '2026-09-10')
  assert.equal(merged.startTime, '15:30')
  assert.deepEqual(draftChangedFields(stored, merged), ['date'])
})

test('la cadena vacía no cuenta como valor y no pisa lo guardado', () => {
  const stored = { serviceId: 'svc-1', serviceName: 'Corte clásico', barberId: null, barberName: null, date: '2026-09-11', startTime: null }
  const merged = mergeDraft(stored, { date: '', serviceName: '' })
  assert.equal(merged.date, '2026-09-11')
  assert.equal(merged.serviceName, 'Corte clásico')
})

// --- Completitud ----------------------------------------------------------

test('completo exige los cuatro ids que necesita createAppointment', () => {
  const base = { serviceId: 'svc-1', barberId: 'brb-1', date: '2026-09-11', startTime: '15:30' }
  assert.ok(isDraftComplete(base))
  for (const campo of ['serviceId', 'barberId', 'date', 'startTime']) {
    assert.ok(!isDraftComplete({ ...base, [campo]: null }), `sin ${campo} no puede estar completo`)
  }
  assert.ok(!isDraftComplete(null))
})

test('un nombre sin id resuelto no alcanza para estar completo', () => {
  // serviceName/barberName son para redactar, no para crear.
  assert.ok(!isDraftComplete({
    serviceId: null, serviceName: 'Corte clásico',
    barberId: null, barberName: 'Ricardo',
    date: '2026-09-11', startTime: '15:30',
  }))
})

// --- Resolución -----------------------------------------------------------

test('un barbero ambiguo devuelve la aclaración y NO pierde los otros datos', async () => {
  const { values, clarify } = await resolveTurnValues(
    { barberName: 'Ricardo', date: '2026-09-11', time: '15:30' },
    'shop-1',
    ctxDosRicardos
  )
  assert.ok(clarify, 'debe pedir aclaración')
  assert.ok(clarify.includes('Ricardo Gómez'))
  assert.ok(clarify.includes('Ricardo Peña'))
  assert.equal(values.barberId, undefined, 'el barbero ambiguo no se guarda')
  // La fecha y la hora que el cliente acaba de dar sobreviven igual.
  assert.equal(values.date, '2026-09-11')
  assert.equal(values.startTime, '15:30')
})

test('un servicio inexistente pide aclaración y lista los que sí existen', async () => {
  const { values, clarify } = await resolveTurnValues(
    { serviceName: 'Coloración', date: '2026-09-11' },
    'shop-1',
    ctx
  )
  assert.ok(clarify.includes('Coloración'))
  assert.ok(clarify.includes('Corte clásico'))
  assert.equal(values.serviceId, undefined)
  assert.equal(values.date, '2026-09-11', 'la fecha del mismo turno no se pierde')
})

test('el servicio se guarda con su nombre canónico, no con lo que escribió el cliente', async () => {
  const { values } = await resolveTurnValues({ serviceName: 'corte' }, 'shop-1', ctx)
  assert.equal(values.serviceId, 'svc-1')
  assert.equal(values.serviceName, 'Corte clásico')
})

// --- TTL ------------------------------------------------------------------

test('un borrador viejo se trata como vacío', () => {
  const ahora = new Date('2026-09-09T12:00:00.000Z')
  const fresco = { updatedAt: new Date('2026-09-09T11:45:00.000Z') }
  const viejo = { updatedAt: new Date('2026-09-09T11:00:00.000Z') }

  assert.ok(!isDraftStale(fresco, ahora), '15 minutos sigue vivo')
  assert.ok(isDraftStale(viejo, ahora), '60 minutos ya venció')
  assert.ok(isDraftStale(null, ahora))
  assert.equal(DRAFT_TTL_MINUTES, 30)
})

test('el borde del TTL cae del lado correcto', () => {
  const ahora = new Date('2026-09-09T12:00:00.000Z')
  const justo = { updatedAt: new Date('2026-09-09T11:30:00.000Z') }
  assert.ok(!isDraftStale(justo, ahora), 'exactamente 30 min todavía vale')
})

// --- Confirmación explícita ----------------------------------------------

test('el resumen muestra los cuatro datos y el día calculado por el código', () => {
  const resumen = buildDraftSummary({
    serviceName: 'Corte clásico',
    barberName: 'Ricardo Gómez',
    date: '2026-09-11',
    startTime: '15:30',
  })
  assert.ok(resumen.includes('Corte clásico'))
  assert.ok(resumen.includes('Ricardo Gómez'))
  assert.ok(resumen.includes('2026-09-11'))
  assert.ok(resumen.includes('15:30'))
  assert.ok(resumen.includes('Viernes'), 'el nombre del día lo pone el código')
})

// El resumen se manda en un turno donde la cita todavía NO existe. Si activara
// el guardia anti-mentira, se descartaría y el cliente nunca podría confirmar.
test('el resumen NO dispara el guardia anti-mentira', () => {
  const resumen = buildDraftSummary({
    serviceName: 'Corte clásico',
    barberName: 'Ricardo Gómez',
    date: '2026-09-11',
    startTime: '15:30',
  })
  assert.ok(!claimsBookingHappened(resumen))
})

test('el resumen pregunta en vez de afirmar', () => {
  const resumen = buildDraftSummary({ serviceName: 'Barba', barberName: 'Juan Ramírez', date: '2026-09-12', startTime: '10:00' })
  assert.ok(resumen.includes('¿'), 'tiene que ser una pregunta')
})

test('confirm_booking y cancel_booking_draft están en los intents que el flujo maneja', () => {
  assert.ok(DRAFT_INTENTS.has('confirm_booking'))
  assert.ok(DRAFT_INTENTS.has('book_appointment'))
  assert.ok(DRAFT_INTENTS.has('clarify'))
  assert.ok(DRAFT_CLEARING_INTENTS.has('cancel_booking_draft'))
  assert.ok(DRAFT_CLEARING_INTENTS.has('cancel_appointment'))
  // Una pregunta de precio no debe tocar el borrador.
  assert.ok(!DRAFT_INTENTS.has('get_prices'))
  assert.ok(!DRAFT_CLEARING_INTENTS.has('get_prices'))
})

// --- Qué se pide cuando falta algo ---------------------------------------

test('se pide un solo dato por vez, en orden', () => {
  assert.ok(missingDraftPrompt({ serviceId: null, barberId: null, date: null, startTime: null }).includes('servicio'))
  assert.ok(missingDraftPrompt({ serviceId: 'svc-1', barberId: null, date: null, startTime: null }).includes('barbero'))
  assert.ok(missingDraftPrompt({ serviceId: 'svc-1', barberId: 'brb-1', date: null, startTime: null }).includes('día'))
  assert.ok(missingDraftPrompt({ serviceId: 'svc-1', barberId: 'brb-1', date: '2026-09-11', startTime: null }).includes('hora'))
})

// Español colombiano de la skill de diseño: tuteo, nunca voseo.
test('los textos nuevos usan tuteo, no voseo', () => {
  const textos = [
    buildDraftSummary({ serviceName: 'Barba', barberName: 'Juan Ramírez', date: '2026-09-12', startTime: '10:00' }),
    missingDraftPrompt({ serviceId: null, barberId: null, date: null, startTime: null }),
    missingDraftPrompt({ serviceId: 'svc-1', barberId: null, date: null, startTime: null }),
    missingDraftPrompt({ serviceId: 'svc-1', barberId: 'brb-1', date: null, startTime: null }),
    missingDraftPrompt({ serviceId: 'svc-1', barberId: 'brb-1', date: '2026-09-11', startTime: null }),
  ]
  const voseo = /\b(podés|querés|decime|elegí|respondé|tenés|dale|contame|mirá|fijate|acá)\b/i
  for (const texto of textos) {
    assert.ok(!voseo.test(texto), `usa voseo: ${texto}`)
  }
})
