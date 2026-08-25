// Validación de variables de entorno al arrancar.
// Las OBLIGATORIAS abortan el arranque si faltan o son inseguras;
// las opcionales solo generan un warning (la feature queda deshabilitada).

const EXAMPLE_SECRETS = [
  'secret', 'changeme', 'change-me', 'tu_secreto', 'jwt_secret',
  'supersecret', 'example', 'mi_secreto', 'secreto123', 'password',
]

const validateEnv = () => {
  const errors = []

  // ─ Obligatorias ─
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL no está definida (conexión a PostgreSQL)')
  }

  const secret = process.env.JWT_SECRET || ''
  if (!secret) {
    errors.push('JWT_SECRET no está definida')
  } else if (secret.length < 32) {
    errors.push(`JWT_SECRET tiene ${secret.length} caracteres; el mínimo seguro es 32. Genera uno con:\n    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
  } else if (EXAMPLE_SECRETS.includes(secret.toLowerCase())) {
    errors.push('JWT_SECRET es un valor de ejemplo. Genera uno aleatorio fuerte.')
  }

  if (errors.length > 0) {
    console.error('\n✗ ERROR DE CONFIGURACIÓN — el servidor NO puede arrancar:\n')
    errors.forEach(e => console.error(`  • ${e}`))
    console.error('\nRevisa backend/.env (usa .env.example como guía).\n')
    process.exit(1)
  }

  // ─ Opcionales: warning pero arrancar ─
  const optional = [
    ['STRIPE_SECRET_KEY', 'pagos con tarjeta (Stripe) deshabilitados'],
    ['STRIPE_WEBHOOK_SECRET', 'webhooks de Stripe serán RECHAZADOS (firma no verificable)'],
    ['EPAYCO_API_KEY', 'pagos PSE/Nequi/Daviplata (ePayco) deshabilitados'],
    ['TWILIO_SID', 'notificaciones WhatsApp deshabilitadas'],
    ['ANTHROPIC_API_KEY', 'chatbot con IA deshabilitado'],
    ['CLOUDINARY_CLOUD_NAME', 'subida de imágenes deshabilitada'],
    ['SMTP_USER', 'envío de emails (recuperación de contraseña) deshabilitado'],
    ['ALLOWED_ORIGINS', 'CORS usará solo http://localhost:5173 (dev)'],
  ]
  for (const [name, consequence] of optional) {
    if (!process.env[name]) {
      console.warn(`⚠ ${name} no configurado: ${consequence}`)
    }
  }
}

// Config tipada y centralizada (preferir esto a process.env disperso)
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtIssuer: 'estilo-api',
  jwtAudience: 'estilo-clients',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173'],
}

module.exports = { validateEnv, config }
