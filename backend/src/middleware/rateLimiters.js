const { rateLimit, ipKeyGenerator } = require('express-rate-limit')

// Rate limiting granular por endpoint.
// Los limiters por usuario se montan DESPUÉS de authMiddleware
// para poder usar req.user.id como clave.
// ipKeyGenerator normaliza IPv6 (evita bypass cambiando de subnet)
const perUserKey = (req) => req.user?.id || ipKeyGenerator(req.ip)

// Registro: 3 por IP cada hora (anti creación masiva de cuentas)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados registros desde esta IP. Intenta en 1 hora.' },
})

// Login: 5 por IP cada 15 min (el bloqueo de cuenta es aparte, en auth.service)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de login. Intenta en 15 minutos.' },
})

// Forgot password: 3 por email (o IP si no hay email) cada hora
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email ? req.body.email.toLowerCase() : ipKeyGenerator(req.ip),
  message: { message: 'Demasiadas solicitudes de recuperación. Intenta en 1 hora.' },
})

// Verificación/reset de OTP: 5 intentos por email (o IP) cada 15 min.
// Frena el brute force del código de 6 dígitos en /verify-reset-code y
// /reset-password. Complementa el contador resetAttempts en BD que invalida
// el token al 5to fallo del código.
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email ? req.body.email.toLowerCase() : ipKeyGenerator(req.ip),
  message: { message: 'Demasiados intentos con el código. Intenta en 15 minutos o solicita uno nuevo.' },
})

// Reseñas: 5 por usuario al día (anti-inflado de ratings)
const reviewLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: perUserKey,
  message: { message: 'Alcanzaste el límite de reseñas por hoy.' },
})

// Citas: 10 por usuario al día (nadie reserva más de 10 citas diarias)
const appointmentLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: perUserKey,
  message: { message: 'Alcanzaste el límite de reservas por hoy.' },
})

// Chatbot: 20 mensajes por usuario por hora (controla costo de la IA)
const chatbotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: perUserKey,
  message: { message: 'Alcanzaste el límite de mensajes del asistente por hora.' },
})

// Exportación de datos: 3 por usuario al día. La consulta toca casi todas las
// tablas, así que no debe poder dispararse en bucle.
const dataExportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: perUserKey,
  message: { message: 'Alcanzaste el límite de descargas de datos por hoy. Intenta mañana.' },
})

// Solicitud pública de eliminación de cuenta: 3 por email (o IP) cada hora.
// Es un endpoint sin autenticar que dispara correos: sin límite serviría para
// bombardear la bandeja de un tercero.
const accountDeletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.email ? req.body.email.toLowerCase() : ipKeyGenerator(req.ip),
  message: { message: 'Demasiadas solicitudes de eliminación. Intenta en 1 hora.' },
})

module.exports = {
  registerLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  reviewLimiter,
  appointmentLimiter,
  chatbotLimiter,
  dataExportLimiter,
  accountDeletionLimiter,
}
