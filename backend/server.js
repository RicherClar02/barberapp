require('dotenv').config()
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Cargado' : '✗ No cargado')
console.log('NODE_ENV:', process.env.NODE_ENV)
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

const { startReminderJob } = require('./src/jobs/reminder.job')

const app = express()

// Seguridad
app.use(helmet())

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes, intenta en 15 minutos' }
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de autenticación, intenta en 15 minutos' }
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Límite de subidas alcanzado, intenta en 1 hora' }
})

// Middlewares
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))
app.use(passport.initialize())
app.use('/api/', generalLimiter)

// Documentación Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Rutas
app.use('/api/auth', authLimiter, authRoutes)
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

// Bienvenida
app.get('/', (req, res) => {
  res.json({ message: 'BarberApp API v1.0.0 — Proyecto de Grado 2025 💈' })
})

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
    services: {
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
      epayco: process.env.EPAYCO_API_KEY ? 'configured' : 'not configured',
      twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not configured',
      firebase: process.env.FIREBASE_PROJECT_ID ? 'configured' : 'not configured',
      cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not configured'
    }
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
  startReminderJob()
})