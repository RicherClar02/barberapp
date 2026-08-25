// Envío de correos transaccionales (SMTP / Gmail).
//
// Config en .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
// SMTP_FROM_NAME, SMTP_FROM_EMAIL. Con Gmail, SMTP_PASS debe ser una
// "contraseña de aplicación" de 16 caracteres, NO la contraseña de la cuenta
// (ver instrucciones en .env.example).
//
// Si no hay credenciales, isEnabled() es false y el envío falla con un error
// explícito en vez de un timeout SMTP de 2 minutos.
const nodemailer = require('nodemailer')

const RESET_CODE_TTL_MINUTES = 15

let transporter = null

const isEnabled = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)

// El transporter se crea una sola vez y se reutiliza (mantiene el pool de
// conexiones); se cachea de forma perezosa para que dotenv ya haya cargado.
const getTransporter = () => {
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465, // 465 = SMTPS directo; 587 = STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

const fromAddress = () => {
  const name = process.env.SMTP_FROM_NAME || 'Estilo'
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
  return `"${name}" <${email}>`
}

const sendMail = async ({ to, subject, html }) => {
  if (!isEnabled()) {
    throw new Error('El envío de emails no está configurado (faltan SMTP_USER/SMTP_PASS en .env)')
  }
  return getTransporter().sendMail({ from: fromAddress(), to, subject, html })
}

const passwordResetTemplate = (code) => `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#F5EFE6;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#4A2C0A;">Recuperar tu contraseña</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5C5C5C;">
        Hola 👋 Recibimos una solicitud para restablecer la contraseña de tu cuenta en Estilo.
        Usa este código para continuar:
      </p>
      <div style="background:#F5EFE6;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
        <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#4A2C0A;">${code}</span>
      </div>
      <p style="margin:0 0 8px;font-size:14px;color:#5C5C5C;">
        El código es válido por <strong>${RESET_CODE_TTL_MINUTES} minutos</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#5C5C5C;">
        <strong>No compartas este código con nadie.</strong> El equipo de Estilo nunca te lo pedirá
        por teléfono, WhatsApp ni redes sociales.
      </p>
      <p style="margin:0;font-size:13px;color:#9E8670;border-top:1px solid #EFE7DC;padding-top:16px;">
        Si no solicitaste este cambio, ignora este mensaje: tu contraseña seguirá siendo la misma.
      </p>
    </div>
    <p style="text-align:center;font-size:12px;color:#9E8670;margin:16px 0 0;">Estilo · Correo automático, no respondas a este mensaje.</p>
  </div>
`

const sendPasswordResetCode = async (to, code) =>
  sendMail({
    to,
    subject: 'Tu código de recuperación Estilo',
    html: passwordResetTemplate(code),
  })

// ─── Eliminación de cuenta ──────────────────────────────
// Envoltura común para no repetir el marco visual en cada plantilla.
const layout = (title, body) => `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#F5EFE6;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#4A2C0A;">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;font-size:12px;color:#9E8670;margin:16px 0 0;">
      Estilo · RC Studio · Villavicencio, Meta, Colombia<br>
      Correo automático, no respondas a este mensaje.
    </p>
  </div>
`

// Paso 1 del borrado desde la web pública: enlace de confirmación.
const accountDeletionRequestTemplate = (name, confirmUrl, ttlHours) => layout(
  'Confirma la eliminación de tu cuenta',
  `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#5C5C5C;">
      Hola ${name || ''} 👋 Recibimos una solicitud para eliminar tu cuenta de Estilo.
      Para continuar, confirma pulsando el botón:
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${confirmUrl}" style="display:inline-block;background:#4A2C0A;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;">
        Eliminar mi cuenta
      </a>
    </div>
    <p style="margin:0 0 8px;font-size:14px;color:#5C5C5C;">
      El enlace es válido por <strong>${ttlHours} horas</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#B91C1C;">
      <strong>Esta acción es irreversible.</strong> Se eliminarán tus datos personales, tus citas
      futuras se cancelarán y perderás tus cortes acumulados de fidelización.
    </p>
    <p style="margin:0;font-size:13px;color:#9E8670;border-top:1px solid #EFE7DC;padding-top:16px;">
      Si no solicitaste esto, ignora el mensaje: sin abrir el enlace no ocurre nada y tu cuenta
      sigue intacta.
    </p>
  `
)

// Paso 2: acuse de recibo, ya sin cuenta que consultar.
const accountDeletedTemplate = (name) => layout(
  'Tu cuenta fue eliminada',
  `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#5C5C5C;">
      Hola ${name || ''}, confirmamos que tu cuenta de Estilo fue eliminada y tus datos
      personales fueron borrados de nuestros sistemas.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#5C5C5C;">
      La purga de las copias de seguridad cifradas se completa en un máximo de
      <strong>30 días</strong>. Conservamos únicamente los registros de facturación exigidos por
      la ley colombiana (5 años), sin ningún dato que permita identificarte.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#5C5C5C;">
      Gracias por haber usado Estilo. Si algún día quieres volver, puedes registrarte de nuevo
      con este mismo correo: será una cuenta nueva.
    </p>
    <p style="margin:0;font-size:13px;color:#9E8670;border-top:1px solid #EFE7DC;padding-top:16px;">
      ¿Dudas sobre este proceso? Escríbenos a richerclarosdiaz@gmail.com
    </p>
  `
)

const sendAccountDeletionRequest = async (to, name, confirmUrl, ttlHours) =>
  sendMail({
    to,
    subject: 'Confirma la eliminación de tu cuenta Estilo',
    html: accountDeletionRequestTemplate(name, confirmUrl, ttlHours),
  })

const sendAccountDeletedConfirmation = async (to, name) =>
  sendMail({
    to,
    subject: 'Tu cuenta de Estilo fue eliminada',
    html: accountDeletedTemplate(name),
  })

module.exports = {
  isEnabled,
  sendMail,
  sendPasswordResetCode,
  sendAccountDeletionRequest,
  sendAccountDeletedConfirmation,
  RESET_CODE_TTL_MINUTES,
}
