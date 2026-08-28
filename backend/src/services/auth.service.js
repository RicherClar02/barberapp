const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const emailService = require('./email.service')

const { logFailedLogin, logAccountLocked, logUserLookup } = require('../utils/securityLog')
const { checkRegistrationIpAbuse } = require('./fraud.service')
const { normalizeEmail } = require('../utils/email')
const { TERMS_VERSION, PRIVACY_VERSION } = require('../constants/legal')
const { PASSWORD_MIN, PASSWORD_MAX, PASSWORD_LENGTH_MESSAGE } = require('../constants/password')

const JWT_ISSUER = 'estilo-api'
const JWT_AUDIENCE = 'estilo-clients'
const MAX_LOGIN_ATTEMPTS = 6
const LOCK_MINUTES = 30

// tv (tokenVersion) invalida todos los JWTs viejos al cambiar la contraseña
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tv: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  )
}

const register = async ({ name, email: rawEmail, password, phone, role, department, city }, ip = null, userAgent = null) => {
  const email = normalizeEmail(rawEmail)
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new Error('El correo ya está registrado')
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const userRole = role || 'CLIENT'
  // CLIENT accounts are auto-verified; BARBER/OWNER require admin approval
  let isVerified = userRole === 'CLIENT'

  // Anti-bots: más de 3 registros desde la misma IP en 24h →
  // la cuenta queda pendiente de verificación adicional
  const suspiciousIp = await checkRegistrationIpAbuse(ip)
  if (suspiciousIp) isVerified = false

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      role: userRole,
      isVerified,
      department: department || null,
      city: city || null,
      registrationIp: ip,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      department: true,
      city: true,
      createdAt: true
    }
  })

  // Prueba del consentimiento (Ley 1581 de 2012). Se registra aquí y no solo
  // desde el frontend porque las cuentas de BARBER/OWNER quedan pendientes de
  // aprobación y no reciben token: sin esto no habría forma de que llamaran a
  // POST /api/legal/accept-terms y quedarían sin registro de aceptación.
  await prisma.termsAcceptance.create({
    data: {
      userId: user.id,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      ipAddress: ip || 'unknown',
      userAgent: userAgent ? userAgent.slice(0, 500) : null,
    },
  })
  await prisma.user.update({
    where: { id: user.id },
    data: { currentTermsAccepted: true },
  })

  if (!isVerified) {
    return {
      pendingApproval: true,
      message: 'Cuenta creada. Un administrador verificará tu cuenta antes de que puedas acceder.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }
  }

  const token = generateToken(user)
  return { user, token }
}

const login = async ({ email: rawEmail, password }, ip = null) => {
  const email = normalizeEmail(rawEmail)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    logFailedLogin(email, ip)
    throw new Error('Credenciales incorrectas')
  }

  if (!user.isActive) {
    throw new Error('Cuenta desactivada')
  }

  // Bloqueo temporal tras demasiados intentos fallidos consecutivos
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lockedUntil) - Date.now()) / 60000)
    const error = new Error(`Cuenta bloqueada temporalmente por intentos fallidos. Intenta en ${minutesLeft} minuto(s).`)
    error.status = 423
    throw error
  }

  const isValid = user.password ? await bcrypt.compare(password, user.password) : false
  if (!isValid) {
    const attempts = (user.loginAttempts || 0) + 1
    const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS

    await prisma.user.update({
      where: { id: user.id },
      data: shouldLock
        ? { loginAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) }
        : { loginAttempts: attempts },
    })

    logFailedLogin(email, ip)
    if (shouldLock) {
      logAccountLocked(email, ip)
      const error = new Error(`Cuenta bloqueada por ${LOCK_MINUTES} minutos tras ${MAX_LOGIN_ATTEMPTS} intentos fallidos.`)
      error.status = 423
      throw error
    }
    // Avisar cuántos intentos van: "Intento 4 de 6"
    const error = new Error(`Credenciales incorrectas. Intento ${attempts} de ${MAX_LOGIN_ATTEMPTS}.`)
    error.status = 401
    throw error
  }

  // Login exitoso: resetear contador y registrar IP
  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null, lastLoginIp: ip },
  })

  // BARBER/OWNER must be verified by admin before they can log in
  if ((user.role === 'BARBER' || user.role === 'OWNER') && !user.isVerified) {
    return {
      pendingApproval: true,
      message: 'Tu cuenta está pendiente de aprobación por un administrador.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    }
  }

  const token = generateToken(user)

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      city: user.city
    },
    token
  }
}

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      isVerified: true,
      department: true,
      city: true,
      whatsappNumber: true,
      createdAt: true
    }
  })

  if (!user) throw new Error('Usuario no encontrado')
  return user
}

// Actualiza el perfil del usuario autenticado
// Permite guardar departamento y ciudad de residencia por defecto
const updateProfile = async (userId, data) => {
  const allowed = ['name', 'phone', 'avatar', 'department', 'city', 'whatsappNumber']
  const updateData = {}
  for (const field of allowed) {
    if (data[field] !== undefined) updateData[field] = data[field]
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('No hay campos válidos para actualizar')
  }

  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      department: true,
      city: true,
      whatsappNumber: true
    }
  })
}

const forgotPassword = async (rawEmail) => {
  const email = normalizeEmail(rawEmail)
  const user = await prisma.user.findUnique({ where: { email } })
  // Always return success to avoid user enumeration
  if (!user) return { message: 'Si el correo existe, recibirás un código de verificación.' }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const hashedOtp = await bcrypt.hash(otp, 10)
  // La misma validez que anuncia el email (email.service.js)
  const expiry = new Date(Date.now() + emailService.RESET_CODE_TTL_MINUTES * 60 * 1000)

  await prisma.user.update({
    where: { email },
    data: { resetToken: hashedOtp, resetTokenExpiry: expiry }
  })

  // Un fallo de SMTP no debe cambiar la respuesta: si el 200 solo llegara
  // cuando el correo existe, el endpoint delataría qué cuentas están
  // registradas. El error queda en los logs del servidor.
  try {
    await emailService.sendPasswordResetCode(email, otp)
  } catch (err) {
    console.error(`[email] No se pudo enviar el código de recuperación a ${email}:`, err.message)
  }

  return { message: 'Si el correo existe, recibirás un código de verificación.' }
}

const verifyResetCode = async (rawEmail, code) => {
  const email = normalizeEmail(rawEmail)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    throw new Error('Código inválido o expirado')
  }

  if (new Date() > user.resetTokenExpiry) {
    throw new Error('El código ha expirado. Solicita uno nuevo.')
  }

  const isValid = await bcrypt.compare(code, user.resetToken)
  if (!isValid) {
    throw new Error('Código incorrecto')
  }

  return { valid: true }
}

const resetPassword = async (rawEmail, code, newPassword) => {
  const email = normalizeEmail(rawEmail)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    throw new Error('Código inválido o expirado')
  }

  if (new Date() > user.resetTokenExpiry) {
    throw new Error('El código ha expirado. Solicita uno nuevo.')
  }

  const isValid = await bcrypt.compare(code, user.resetToken)
  if (!isValid) {
    throw new Error('Código incorrecto')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      // Invalida todos los JWTs emitidos antes del cambio de contraseña
      tokenVersion: { increment: 1 },
      loginAttempts: 0,
      lockedUntil: null,
    }
  })

  return { message: 'Contraseña actualizada correctamente. Vuelve a iniciar sesión.' }
}

// Cambio de contraseña desde el perfil, con la sesión ya iniciada. A diferencia
// de resetPassword (que prueba identidad con el OTP del correo), acá la prueba
// es la contraseña actual, así que se compara contra el hash del usuario del
// token: nadie puede cambiarle la contraseña a otro.
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    const error = new Error('Usuario no encontrado')
    error.status = 404
    throw error
  }

  // Cuentas creadas por Google/Facebook no tienen hash local contra el cual
  // comparar. Decirlo explícito evita que el dueño crea que se equivocó al
  // escribir una contraseña que nunca existió.
  if (!user.password) {
    const error = new Error('Tu cuenta inicia sesión con Google o Facebook, no tiene una contraseña que cambiar')
    error.status = 400
    throw error
  }

  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) {
    const error = new Error('La contraseña actual es incorrecta')
    error.status = 401
    throw error
  }

  // Recién con la identidad probada se evalúa la nueva. El mensaje es distinto
  // del anterior a propósito: son dos fallos distintos y el usuario tiene que
  // saber cuál de los dos campos corregir.
  if (newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX) {
    const error = new Error(`La nueva contraseña no cumple los requisitos: ${PASSWORD_LENGTH_MESSAGE.toLowerCase()}`)
    error.status = 400
    throw error
  }

  if (newPassword === currentPassword) {
    const error = new Error('La nueva contraseña debe ser distinta de la actual')
    error.status = 400
    throw error
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      // Igual que resetPassword: invalida todos los JWTs previos, incluido el
      // que hizo esta misma request. Si la contraseña se cambió porque la
      // anterior estaba comprometida, dejar vivas las sesiones viejas anularía
      // el motivo del cambio.
      tokenVersion: { increment: 1 },
      loginAttempts: 0,
      lockedUntil: null,
    },
  })

  return { message: 'Contraseña actualizada correctamente. Vuelve a iniciar sesión.' }
}

// Busca un usuario por email para que un dueño pueda sumarlo como barbero.
// Devuelve el mínimo indispensable: id, nombre y rol. Nada de teléfono, ciudad,
// estado de verificación ni fecha de alta — con eso el endpoint sirve para
// confirmar "es este Juan" y para nada más. El rol viaja porque addBarber exige
// que sea BARBER: sin él el dueño no puede entender por qué falla el alta.
const findUserByEmail = async (email, requesterId) => {
  if (!String(email ?? '').trim()) throw new Error('Email requerido')
  // Corrige el comentario anterior, que decía que register guardaba el email
  // "tal cual lo escribió el usuario": es falso. register lo guarda normalizado,
  // así que buscar sin normalizar dejaba fuera a cualquiera cuyo correo cambie
  // al normalizarse. Un barbero registrado como carlos.ramirez+trabajo@gmail.com
  // está guardado como carlosramirez@gmail.com, y el dueño que escribía la forma
  // larga recibía "no hay ninguna cuenta con ese correo" siendo que sí existe.
  const normalized = normalizeEmail(email)

  // findUnique, no findFirst con mode:'insensitive': normalizeEmail ya pasa todo
  // a minúsculas, así que la comparación exacta alcanza y usa el índice único.
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, name: true, role: true }
  })

  logUserLookup(requesterId, normalized, !!user)

  if (!user) return { found: false }
  return { found: true, user }
}

module.exports = { register, login, getProfile, updateProfile, forgotPassword, verifyResetCode, resetPassword, changePassword, findUserByEmail }
