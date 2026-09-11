require('dotenv').config()
const { validateEnv, config } = require('./src/config/env')
// Validar variables obligatorias ANTES de cargar el resto:
// si JWT_SECRET falta o es débil, el servidor NO arranca
validateEnv()
// "✓ Cargado" solo confirmaba que la variable existe, no a dónde apunta, que
// es el único dato que distingue la base local de producción.
require('./src/lib/dbTarget').announceDbTarget('server')
console.log('NODE_ENV:', config.nodeEnv)
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const passport = require('passport')
const swaggerUi = require('swagger-ui-express')
const { swaggerSpec } = require('./src/config/swagger')
require('./src/config/passport')

const authRoutes = require('./src/routes/auth.routes')
const barbershopRoutes = require('./src/routes/barbershop.routes')
const barberRoutes = require('./src/routes/barber.routes')
const serviceRoutes = require('./src/routes/service.routes')
const scheduleRoutes = require('./src/routes/schedule.routes')
const appointmentRoutes = require('./src/routes/appointment.routes')
const reviewRoutes = require('./src/routes/review.routes')
const paymentRoutes = require('./src/routes/payment.routes')
const configRoutes = require('./src/routes/config.routes')
const loyaltyRoutes = require('./src/routes/loyalty.routes')
const notificationRoutes = require('./src/routes/notification.routes')
const adRoutes = require('./src/routes/ad.routes')
const earningsRoutes = require('./src/routes/earnings.routes')
const waitlistRoutes = require('./src/routes/waitlist.routes')
const calendarRoutes = require('./src/routes/calendar.routes')
const barberCardRoutes = require('./src/routes/barber-card.routes')
const subscriptionRoutes = require('./src/routes/subscription.routes')
const uploadRoutes = require('./src/routes/upload.routes')
const offerRoutes = require('./src/routes/offer.routes')
const analyticsRoutes = require('./src/routes/analytics.routes')
const searchRoutes = require('./src/routes/search.routes')
const chatbotRoutes = require('./src/routes/chatbot.routes')
const adminRoutes = require('./src/routes/admin.routes')
const locationRoutes = require('./src/routes/location.routes')
const legalRoutes = require('./src/routes/legal.routes')
const userRoutes = require('./src/routes/user.routes')

const { startReminderJob } = require('./src/jobs/reminder.job')

const app = express()

// Detrás de proxy/load balancer (Render, Railway, etc.): req.ip
// se toma de X-Forwarded-For — necesario para rate limit y anti-fraude
app.set('trust proxy', 1)

// Seguridad de headers (configuración explícita)
app.use(helmet({
  // CSP que permite los assets inline de Swagger UI en /api-docs
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'"],
    },
  },
  // HSTS solo en producción (en dev no hay HTTPS)
  hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
  hidePoweredBy: true, // ocultar que es Express
}))

// CORS estricto: solo orígenes de la allowlist.
// Las apps móviles nativas no envían origin → se permiten (su
// seguridad la da el JWT, no CORS).
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('CORS no permitido'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))

// Rate limiters globales (los granulares por endpoint están en
// src/middleware/rateLimiters.js y se montan en cada ruta)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes, intenta en 15 minutos' }
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Límite de subidas alcanzado, intenta en 1 hora' }
})

// Middlewares
app.use(express.json({ limit: '1mb' })) // rechazar payloads > 1MB
// :remote-addr para ver desde qué IP llega cada request (útil para
// confirmar que el celular de la LAN está llegando al backend)
app.use(morgan(':remote-addr :method :url :status :response-time ms'))
app.use(passport.initialize())
app.use('/api/', generalLimiter)

// Documentación Swagger
// - En desarrollo: acceso libre.
// - En producción: Basic Auth con SWAGGER_USER / SWAGGER_PASS.
//   Si no están definidas en producción, /api-docs queda deshabilitado.
if (!config.isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
} else if (process.env.SWAGGER_USER && process.env.SWAGGER_PASS) {
  const swaggerAuth = (req, res, next) => {
    const header = req.headers.authorization || ''
    const [scheme, encoded] = header.split(' ')
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':')
      if (user === process.env.SWAGGER_USER && pass === process.env.SWAGGER_PASS) {
        return next()
      }
    }
    res.set('WWW-Authenticate', 'Basic realm="Estilo API Docs"')
    return res.status(401).json({ message: 'Autenticación requerida' })
  }
  app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec))
  console.log('[Swagger] Protegido con Basic Auth en producción')
} else {
  console.warn('[Swagger] Deshabilitado en producción (SWAGGER_USER/SWAGGER_PASS no definidas)')
}

// Rutas (register/login/forgot-password tienen sus propios limiters)
app.use('/api/auth', authRoutes)
app.use('/api/barbershops', barbershopRoutes)
app.use('/api/barbers', barberRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/config', configRoutes)
app.use('/api/loyalty', loyaltyRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/ads', adRoutes)
app.use('/api/earnings', earningsRoutes)
app.use('/api/waitlist', waitlistRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/barber-card', barberCardRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/upload', uploadLimiter, uploadRoutes)
app.use('/api/offers', offerRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/legal', legalRoutes)
app.use('/api/users', userRoutes)

// Bienvenida
app.get('/', (req, res) => {
  res.json({ message: 'Estilo API v1.0.0 — Proyecto de Grado 2025 💈' })
})

// Un servicio está configurado solo si TODAS las variables que necesita para
// arrancar están puestas. Con una sola a medias la feature falla igual, y el
// listado diría que está lista.
const configured = (...vars) =>
  vars.every(v => v && String(v).trim()) ? 'configured' : 'not configured'

// Health check
app.get('/health', async (req, res) => {
  let dbStatus = 'connected'
  try {
    const { PrismaClient } = require('@prisma/client')
    const { PrismaPg } = require('@prisma/adapter-pg')
    const pg = require('pg')
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    await prisma.$queryRaw`SELECT 1`
    await pool.end()
  } catch {
    dbStatus = 'error'
  }

  res.json({
    status: 'ok',
    timestamp: new Date(),
    version: '1.0.0',
    database: dbStatus,
    // Cada entrada comprueba EXACTAMENTE la misma condición que usa la feature
    // para decidir si puede trabajar. Dos de estas miraban una variable que no
    // lee nadie más —TWILIO_ACCOUNT_SID y FIREBASE_PROJECT_ID, cuando el
    // servicio usa TWILIO_SID y FIREBASE_SERVER_KEY— así que reportaban "not
    // configured" con el servicio bien configurado. Este endpoint es la
    // herramienta de diagnóstico en producción: si miente sobre dos servicios,
    // no se puede confiar en lo que dice de los otros cuatro.
    services: {
      stripe: configured(process.env.STRIPE_SECRET_KEY),
      epayco: configured(process.env.EPAYCO_API_KEY),
      // notification.service.js exige las dos para instanciar el cliente.
      twilio: configured(process.env.TWILIO_SID, process.env.TWILIO_TOKEN),
      // Ojo: tener la key no significa que el push funcione — el envío real
      // sigue siendo un TODO en notification.service.js. Esto reporta la
      // configuración, que es lo que este listado promete.
      firebase: configured(process.env.FIREBASE_SERVER_KEY),
      // cloudinary.config() necesita las tres: con solo cloud_name la subida
      // falla igual, así que reportar "configured" con una sola era engañoso.
      cloudinary: configured(
        process.env.CLOUDINARY_CLOUD_NAME,
        process.env.CLOUDINARY_API_KEY,
        process.env.CLOUDINARY_API_SECRET
      ),
      // El chatbot faltaba en este listado: era imposible confirmar desde
      // afuera si la key estaba puesta en el hosting sin entrar al dashboard.
      anthropic: configured(process.env.ANTHROPIC_API_KEY)
    }
  })
})

// 404 en JSON. El default de Express responde HTML ("Cannot PUT /api/..."),
// y tanto el panel web como la app leen err.response.data.message: con HTML
// ese campo queda undefined y el frontend cae a su mensaje por defecto, que
// puede afirmar una causa equivocada. Debe ir después de todas las rutas y
// antes del manejador de errores.
app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` })
})

// Middleware global de errores: en producción NUNCA exponer stack
// traces ni mensajes crudos de Prisma. El detalle se loguea solo
// en el servidor.
app.use((err, req, res, next) => {
  if (err.message === 'CORS no permitido') {
    return res.status(403).json({ error: 'Origen no permitido' })
  }

  // Payload demasiado grande (express.json limit)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload demasiado grande (máximo 1MB)' })
  }

  console.error('[ERROR]', err)

  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
  res.status(500).json({ error: err.message })
})

const PORT = config.port
// '0.0.0.0': escuchar en TODAS las interfaces de red, no solo 127.0.0.1.
// Necesario para que dispositivos de la LAN (ej. el celular con Expo Go)
// puedan conectarse usando la IP del PC.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Estilo backend corriendo en http://0.0.0.0:${PORT} (accesible desde la LAN)`)
  startReminderJob()
})