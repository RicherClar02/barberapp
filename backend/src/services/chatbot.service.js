const https = require('https')
const prisma = require('../lib/prisma')
const { isPastDateTime, nowInShopTimezone } = require('./shared/slots.service')

// Motivos de fallo del asistente. Cada uno tiene un mensaje distinto para el
// cliente: antes los cuatro casos (falta la key, sin créditos, rate limit,
// error inesperado) devolvían la misma disculpa genérica y no dejaban rastro
// en los logs, así que era imposible saber cuál de todos estaba pasando.
const AI_FAILURE = {
  CONFIG: 'config',
  RATE_LIMIT: 'rate_limit',
  GENERIC: 'generic',
}

const AI_FAILURE_REPLY = {
  [AI_FAILURE.CONFIG]:
    'El asistente no está disponible en este momento. Podés reservar tu cita ' +
    'directamente desde la barbería: elegí el servicio y te mostramos los ' +
    'horarios libres.',
  [AI_FAILURE.RATE_LIMIT]:
    'El asistente está recibiendo muchas consultas ahora mismo. Esperá un ' +
    'minuto y volvé a intentar.',
  [AI_FAILURE.GENERIC]:
    'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.',
}

// Un error se clasifica como CONFIG cuando la causa está del lado de nuestra
// cuenta y el cliente no puede resolverla reintentando: falta la API key,
// es inválida, o se acabaron los créditos. En esos casos lo honesto es
// mandarlo al flujo manual de reserva en vez de invitarlo a reintentar.
const classifyAiError = (err) => {
  if (!process.env.ANTHROPIC_API_KEY) return AI_FAILURE.CONFIG

  const status = err?.status
  const text = String(err?.message || '').toLowerCase()

  if (status === 429 || text.includes('rate limit')) return AI_FAILURE.RATE_LIMIT
  if (
    status === 401 ||
    status === 403 ||
    text.includes('credit balance') ||
    text.includes('insufficient') ||
    text.includes('quota') ||
    text.includes('billing') ||
    text.includes('authentication') ||
    text.includes('invalid x-api-key')
  ) {
    return AI_FAILURE.CONFIG
  }
  return AI_FAILURE.GENERIC
}

// Llama a la API de Anthropic via HTTPS nativo (sin SDK extra)
const callAnthropic = (messages, systemPrompt) => {
  return new Promise((resolve, reject) => {
    // Sin key no tiene sentido salir a la red: Anthropic devolvería 401 y el
    // motivo real (falta configurar el servicio) quedaría disfrazado.
    if (!process.env.ANTHROPIC_API_KEY) {
      return reject(new Error('ANTHROPIC_API_KEY no está configurada'))
    }

    const body = JSON.stringify({
      // Configurable por entorno para poder cambiar de modelo sin desplegar
      // código. Se lee en cada llamada, no al cargar el módulo, para que un
      // cambio de variable no exija reiniciar el proceso.
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      // 2048 y no 1024: en los modelos con razonamiento adaptativo los tokens
      // de pensamiento cuentan contra este techo, así que una consulta compleja
      // podía quedar truncada. Solo se paga lo que se genera, no el techo.
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    })

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          // El status HTTP viaja con el error: es lo que distingue un 429
          // (reintentable) de un 401 o un saldo agotado (no reintentable).
          if (parsed.error) {
            const err = new Error(parsed.error.message)
            err.status = res.statusCode
            return reject(err)
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const err = new Error(`Anthropic respondió ${res.statusCode}`)
            err.status = res.statusCode
            return reject(err)
          }
          // El primer bloque NO siempre es el texto: los modelos con
          // razonamiento adaptativo (Sonnet 5 en adelante) devuelven un
          // bloque "thinking" en content[0] y dejan la respuesta en el
          // siguiente. Leer content[0].text a ciegas daba undefined y el
          // cliente veía "Entendido." en vez de la respuesta real.
          const bloqueTexto = parsed.content?.find(b => b.type === 'text')
          resolve(bloqueTexto?.text || '')
        } catch (e) {
          e.status = e.status || res.statusCode
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// Mismo orden que schedule.dayOfWeek y que Date#getUTCDay().
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Ancla temporal que se le pasa al modelo. Sin esto el prompt no llevaba
// ninguna fecha y el modelo inventaba qué día era hoy a partir de su prior:
// un martes respondía "hoy es lunes" y cruzaba ese día contra HORARIOS para
// decirle al cliente que la barbería estaba cerrada. El nombre del día se
// calcula acá y no se deja deducir del YYYY-MM-DD, que es el mismo error una
// capa más abajo. La fecha se lee en la zona de la barbería, igual que hace
// la disponibilidad de slots: el servidor corre en UTC y a partir de las
// 19:00 hora Colombia ya está en el día siguiente.
const shopNowForPrompt = (now = new Date()) => {
  const { date, time } = nowInShopTimezone(now)
  // Medianoche UTC de esa fecha civil: leer getUTCDay() sobre eso da el día
  // de la semana sin que la zona del proceso lo corra.
  const dayName = DAY_NAMES[new Date(`${date}T00:00:00.000Z`).getUTCDay()]
  return { date, time, dayName }
}

// Carga el contexto de la barbería: barberos (SOLO de esta barbería, con
// id, nombre completo, especialidad y rating), servicios y horarios
const loadShopContext = async (barbershopId) => {
  const [shop, barbers, services, schedules] = await Promise.all([
    prisma.barbershop.findUnique({ where: { id: barbershopId }, select: { name: true, address: true, phone: true } }),
    prisma.barber.findMany({
      where: { barbershopId, isActive: true },
      include: {
        user: { select: { name: true } },
        reviews: { where: { flagged: false }, select: { rating: true } },
      },
    }),
    prisma.service.findMany({
      where: { barbershopId, isActive: true },
      select: { id: true, name: true, price: true, duration: true },
    }),
    prisma.schedule.findMany({
      where: { barbershopId },
      orderBy: { dayOfWeek: 'asc' },
    }),
  ])

  const scheduleText = schedules
    .map(s => s.isOpen ? `${DAY_NAMES[s.dayOfWeek]}: ${s.openTime}–${s.closeTime}` : `${DAY_NAMES[s.dayOfWeek]}: Cerrado`)
    .join(', ')

  return {
    shopName: shop?.name || 'Barbería',
    address: shop?.address || '',
    phone: shop?.phone || '',
    barbers: barbers.map(b => ({
      id: b.id,
      name: b.user.name,
      specialty: b.specialty || 'General',
      rating: b.reviews.length
        ? Math.round(b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length * 10) / 10
        : null,
    })),
    services: services.map(s => ({ id: s.id, name: s.name, price: s.price, duration: s.duration })),
    schedule: scheduleText,
  }
}

// Resolución determinista de barbero por nombre/selección parcial.
// Retorna { status: 'resolved'|'ambiguous'|'none', barber?, matches? }
// Acepta coincidencias parciales ("García", "el de fades") sobre nombre y especialidad.
const resolveBarberByName = (nameOrSelection, barbers) => {
  if (!nameOrSelection) return { status: 'none', matches: [] }
  const q = nameOrSelection.toLowerCase().trim()

  // Coincidencia por nombre completo exacto
  const exact = barbers.filter(b => b.name.toLowerCase() === q)
  if (exact.length === 1) return { status: 'resolved', barber: exact[0] }

  // Coincidencia por partes del nombre (ej: "García" → "Juan García")
  // Se ignoran partículas cortas ("de", "la") para evitar falsos positivos
  let matches = barbers.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.name.toLowerCase().split(/\s+/).some(part => part.length >= 3 && q.includes(part))
  )

  // Coincidencia por especialidad (ej: "el de fades")
  if (matches.length === 0) {
    matches = barbers.filter(b => b.specialty && q.includes(b.specialty.toLowerCase()))
  }

  if (matches.length === 1) return { status: 'resolved', barber: matches[0] }
  if (matches.length > 1) return { status: 'ambiguous', matches }
  return { status: 'none', matches: [] }
}

const SYSTEM_PROMPT_TEMPLATE = (ctx, shopNow) => `
Eres el asistente virtual de "${ctx.shopName}", una barbería ubicada en ${ctx.address}.

BARBEROS DE ESTA BARBERÍA (id | nombre completo | especialidad | rating):
${ctx.barbers.map(b => `- ${b.id} | ${b.name} | ${b.specialty} | ${b.rating != null ? `⭐${b.rating}` : 'sin reseñas'}`).join('\n') || 'Ninguno registrado aún'}

SERVICIOS:
${ctx.services.map(s => `- ${s.name}: $${s.price.toLocaleString('es-CO')} COP (${s.duration} min)`).join('\n')}

HORARIOS: ${ctx.schedule}

Tu misión es ayudar a los clientes a:
1. Reservar citas (book_appointment)
2. Cancelar sus citas (cancel_appointment)
3. Consultar disponibilidad (check_availability)
4. Conocer precios (get_prices)
5. Conocer horarios (get_hours)
6. Responder preguntas generales (faq)
7. Pedir aclaración cuando hay ambigüedad (clarify)

REGLAS DE DESAMBIGUACIÓN DE BARBEROS (OBLIGATORIAS):
1. Solo existen los barberos listados arriba. NUNCA inventes barberos.
2. Si el cliente menciona un nombre que coincide con DOS o más barberos
   (ej: dos "Juan"), NUNCA asumas cuál es. Usa intent "clarify" y responde
   listando las opciones numeradas con nombre completo, especialidad y rating:
   "Tenemos dos barberos llamados Juan:
    1. Juan García — Fades ⭐4.9
    2. Juan Ramírez — Clásicos ⭐4.7
    ¿Con cuál prefieres?"
3. Acepta respuestas parciales del cliente para resolver la ambigüedad:
   "con García", "el primero", "el de fades". Usa el historial de la
   conversación: si en tu mensaje anterior listaste opciones y el cliente
   responde con una selección parcial, resuélvela contra esa lista.
4. Si el nombre NO coincide con ningún barbero de la lista, usa intent
   "clarify" y responde: "No tenemos un barbero llamado [X]. Nuestros
   barberos son: [lista]. ¿Con cuál quieres tu cita?"
5. RESOLUCIÓN POR ID, NUNCA POR NOMBRE: para intent "book_appointment"
   SIEMPRE debes incluir el campo "barberId" con el id exacto de la lista
   de arriba. Si no puedes determinar el barberId con certeza, usa
   intent "clarify" y deja "barberId" en null. NO crees la cita.

SIEMPRE responde en español de forma amigable y concisa.

FORMATO DEL CAMPO "reply" (OBLIGATORIO):
El cliente lee esa respuesta como texto plano en una burbuja de chat: no hay
render de markdown. NO uses asteriscos, guiones bajos, backticks, almohadillas
ni ningún marcador de markdown — se ven literales y quedan feos. Nada de
**negrita**, *cursiva*, comillas invertidas ni ## títulos. Para destacar usá
MAYÚSCULAS o emojis. Para listar, numerá con "1." al principio de cada línea y
separá con saltos de línea reales.

Responde ÚNICAMENTE con JSON válido en este formato:
{
  "intent": "book_appointment|cancel_appointment|check_availability|get_prices|get_hours|faq|clarify",
  "barberId": "id exacto del barbero de la lista o null",
  "barberName": "nombre completo del barbero o null",
  "date": "YYYY-MM-DD o null",
  "time": "HH:MM o null",
  "serviceName": "nombre del servicio o null",
  "reply": "tu respuesta amigable al cliente"
}

Si el usuario quiere reservar, recopila barbero (resuelto a barberId), servicio, fecha y hora antes de confirmar.
Si falta información o hay ambigüedad, pídela en el campo "reply" con intent "clarify".

FECHA Y HORA ACTUALES (AUTORIDAD ABSOLUTA):
Hoy es ${shopNow.dayName} ${shopNow.date} y en la barbería son las ${shopNow.time}.
Este dato lo calcula el servidor y es la ÚNICA fuente de verdad sobre qué día y
qué hora es. NUNCA lo deduzcas, lo supongas ni lo contradigas, y NUNCA digas que
hoy es otro día del que dice esta línea.
Resolvé TODA fecha relativa contra ese dato:
- "hoy" es ${shopNow.date} (${shopNow.dayName})
- "mañana" es el día siguiente a ${shopNow.date}
- "el viernes", "el próximo martes" y similares son la PRÓXIMA vez que cae ese
  día contando desde ${shopNow.date}, nunca una que ya pasó
El campo "date" que devuelvas nunca puede ser anterior a ${shopNow.date}, y si es
igual a ${shopNow.date} entonces "time" tiene que ser posterior a ${shopNow.time}.
Para decir si la barbería abre o cierra un día, buscá el nombre de ESE día en
HORARIOS. Para "hoy" el día que tenés que buscar es ${shopNow.dayName}.
`

const processMessage = async (userId, barbershopId, text) => {
  // Cargar historial reciente (últimos 10 mensajes)
  const history = await prisma.chatMessage.findMany({
    where: { userId, barbershopId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  history.reverse()

  const ctx = await loadShopContext(barbershopId)
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE(ctx, shopNowForPrompt())

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: text },
  ]

  // Guardar mensaje del usuario
  await prisma.chatMessage.create({
    data: { userId, barbershopId, role: 'user', content: text },
  })

  let parsed = { intent: 'faq', reply: '', barberId: null, barberName: null, date: null, time: null, serviceName: null }

  try {
    const rawResponse = await callAnthropic(messages, systemPrompt)
    // Extraer JSON de la respuesta (puede venir con texto extra)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = { ...parsed, ...JSON.parse(jsonMatch[0]) }
    else parsed.reply = rawResponse
  } catch (err) {
    // Nunca tragar el error en silencio: sin esta línea un ReferenceError, una
    // key inválida, un rate limit y los créditos agotados eran indistinguibles
    // tanto para el cliente como en los logs.
    const failure = classifyAiError(err)
    console.error(
      `[chatbot] fallo al llamar a la IA (motivo=${failure}, status=${err?.status ?? 'n/a'}, barbershopId=${barbershopId}):`,
      err
    )
    parsed.reply = AI_FAILURE_REPLY[failure]
    parsed.intent = 'faq'
  }

  // Ejecutar acción según intent
  // "clarify" nunca crea nada: solo devuelve la pregunta de aclaración
  let actionResult = null
  if (
    parsed.intent === 'book_appointment' &&
    (parsed.barberId || parsed.barberName) &&
    parsed.date && parsed.time && parsed.serviceName
  ) {
    actionResult = await handleBookAppointment(userId, barbershopId, parsed, ctx)
    if (actionResult?.error) {
      parsed.reply = actionResult.error
      // La cita no se creó: degradar el intent para que el front no asuma éxito
      parsed.intent = 'clarify'
    } else if (actionResult?.appointment) {
      parsed.reply = `✅ ¡Cita reservada! ${actionResult.barberName} el ${parsed.date} a las ${parsed.time} para ${parsed.serviceName}. Te recordaremos 15 min antes.`
    }
  }

  // Guardar respuesta del asistente
  const saved = await prisma.chatMessage.create({
    data: {
      userId,
      barbershopId,
      role: 'assistant',
      content: parsed.reply || 'Entendido.',
      intent: parsed.intent,
    },
  })

  return { message: saved, intent: parsed.intent, reply: parsed.reply }
}

// Mensaje de aclaración listando los barberos dados
const barberOptionsMessage = (intro, barbers) => {
  const list = barbers
    .map((b, i) => `${i + 1}. ${b.name} — ${b.specialty}${b.rating != null ? ` ⭐${b.rating}` : ''}`)
    .join('\n')
  return `${intro}\n${list}\n¿Con cuál prefieres tu cita?`
}

// Validación defensiva: antes de crear la cita, el barberId retornado por
// la IA debe existir Y pertenecer a esta barbería. Si no, se responde al
// cliente pidiendo aclaración — nunca un error 500.
const resolveBarberForBooking = async (parsed, barbershopId, ctx) => {
  // 1. Intentar por barberId (la vía correcta según el prompt)
  if (parsed.barberId) {
    const barber = await prisma.barber.findFirst({
      where: { id: parsed.barberId, barbershopId, isActive: true },
    })
    if (barber) {
      const inCtx = ctx.barbers.find(b => b.id === barber.id)
      return { barber: inCtx || { id: barber.id, name: parsed.barberName || 'tu barbero' } }
    }
    // barberId inválido o de otra barbería: caer a resolución por nombre
  }

  // 2. Resolución determinista por nombre/selección parcial
  const result = resolveBarberByName(parsed.barberName, ctx.barbers)

  if (result.status === 'resolved') return { barber: result.barber }

  if (result.status === 'ambiguous') {
    const firstName = result.matches[0].name.split(' ')[0]
    return {
      error: barberOptionsMessage(
        `Tenemos ${result.matches.length} barberos llamados ${firstName}:`,
        result.matches
      ),
    }
  }

  return {
    error: barberOptionsMessage(
      `No tenemos un barbero llamado "${parsed.barberName || '?'}" en esta barbería. Nuestros barberos son:`,
      ctx.barbers
    ),
  }
}

const handleBookAppointment = async (userId, barbershopId, parsed, ctx) => {
  try {
    const service = ctx.services.find(s => s.name.toLowerCase().includes(parsed.serviceName?.toLowerCase()))
    if (!service) return { error: `No encontré el servicio "${parsed.serviceName}". Los servicios disponibles son: ${ctx.services.map(s => s.name).join(', ')}` }

    // Este camino crea la cita directo, sin pasar por createAppointment: sin
    // esta validación la IA podía reservar en el pasado si interpretaba mal
    // una fecha ("el viernes" del viernes que ya fue).
    if (isPastDateTime(parsed.date, parsed.time)) {
      return { error: 'Esa fecha y hora ya pasaron. Decime un horario a futuro y te la reservo.' }
    }

    const resolution = await resolveBarberForBooking(parsed, barbershopId, ctx)
    if (resolution.error) return { error: resolution.error }
    const barber = resolution.barber

    // Calcular endTime
    const [h, m] = parsed.time.split(':').map(Number)
    const endMinutes = h * 60 + m + service.duration
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

    const appointment = await prisma.appointment.create({
      data: {
        clientId: userId,
        barbershopId,
        barberId: barber.id,
        serviceId: service.id,
        date: new Date(parsed.date),
        startTime: parsed.time,
        endTime,
        totalPrice: service.price,
        status: 'PENDING',
      },
    })
    return { appointment, barberName: barber.name }
  } catch (err) {
    return { error: 'No pude crear la cita. Verifica la disponibilidad e intenta de nuevo.' }
  }
}

const getHistory = async (userId, barbershopId, limit = 50) => {
  return prisma.chatMessage.findMany({
    where: { userId, barbershopId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })
}

module.exports = {
  processMessage,
  getHistory,
  shopNowForPrompt,
  SYSTEM_PROMPT_TEMPLATE,
  resolveBarberByName,
  resolveBarberForBooking,
  loadShopContext,
  classifyAiError,
  AI_FAILURE,
  AI_FAILURE_REPLY,
}
