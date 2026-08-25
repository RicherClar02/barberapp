// Prueba de envío real por SMTP: manda un código de recuperación de ejemplo.
//
// Uso: node scripts/test-email.js tu-correo@gmail.com
// Antes: configura SMTP_HOST/PORT/USER/PASS en .env (ver .env.example).
require('dotenv').config()
const emailService = require('../src/services/email.service')

;(async () => {
  const testEmail = process.argv[2]
  if (!testEmail) {
    console.log('Uso: node scripts/test-email.js tu-email@gmail.com')
    process.exit(1)
  }

  if (!emailService.isEnabled()) {
    console.error('❌ Faltan SMTP_USER y/o SMTP_PASS en .env (ver .env.example)')
    process.exit(1)
  }

  console.log(`Enviando desde ${process.env.SMTP_USER} vía ${process.env.SMTP_HOST || 'smtp.gmail.com'}...`)

  try {
    const info = await emailService.sendPasswordResetCode(testEmail, '123456')
    console.log('✅ Email enviado a', testEmail)
    if (info?.messageId) console.log('   messageId:', info.messageId)
    console.log('   Revisa la bandeja de entrada y también la carpeta de spam.')
  } catch (e) {
    console.error('❌ Error:', e.message)
    // Gmail rechaza la contraseña normal de la cuenta: solo acepta
    // contraseñas de aplicación cuando la verificación en 2 pasos está activa.
    if (e.code === 'EAUTH') {
      console.error('   Gmail rechazó las credenciales. Verifica que SMTP_PASS sea una')
      console.error('   "contraseña de aplicación" de 16 caracteres sin espacios, no la')
      console.error('   contraseña normal de la cuenta.')
    }
    process.exit(1)
  }
})()
