const fs = require('fs')
const path = require('path')

// Log de eventos de seguridad: consola + archivo logs/security.log
// REGLA: NUNCA loguear contraseñas, tokens ni números de tarjeta.
const LOG_DIR = path.join(__dirname, '..', '..', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'security.log')

const writeLine = (level, event, details = {}) => {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details,
  }
  const line = JSON.stringify(entry)
  console.warn(`[SECURITY:${level}] ${event}`, details)
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    fs.appendFileSync(LOG_FILE, line + '\n')
  } catch {
    // El log a archivo nunca debe tumbar la request
  }
}

const logFailedLogin = (email, ip) =>
  writeLine('WARN', 'FAILED_LOGIN', { email, ip })

const logAccountLocked = (email, ip) =>
  writeLine('ALERT', 'ACCOUNT_LOCKED', { email, ip })

const logFlaggedReview = (reviewId, clientId, barbershopId, reason) =>
  writeLine('ALERT', 'REVIEW_FLAGGED', { reviewId, clientId, barbershopId, reason })

const logSuspiciousIp = (ip, detail) =>
  writeLine('ALERT', 'SUSPICIOUS_IP', { ip, detail })

const logInvalidWebhook = (provider, ip, detail) =>
  writeLine('ALERT', 'INVALID_WEBHOOK_SIGNATURE', { provider, ip, detail })

const logHoneypot = (ip, email) =>
  writeLine('ALERT', 'HONEYPOT_TRIGGERED', { ip, email })

// Intento fallido de código OTP de recuperación de contraseña.
// attemptsLeft: intentos restantes antes de invalidar el token.
const logFailedOtp = (email, ip, attemptsLeft) =>
  writeLine('WARN', 'FAILED_RESET_OTP', { email, ip, attemptsLeft })

module.exports = {
  logFailedLogin,
  logAccountLocked,
  logFlaggedReview,
  logSuspiciousIp,
  logInvalidWebhook,
  logHoneypot,
  logFailedOtp,
}
