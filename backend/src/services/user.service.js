const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')
const emailService = require('./email.service')
const { PUBLIC_WEB_URL } = require('../constants/legal')

const DELETION_TOKEN_TTL_HOURS = 24

// ─────────────────────────────────────────────────────────
// Derecho de portabilidad (art. 20 GDPR / Ley 1581 de 2012)
// ─────────────────────────────────────────────────────────

// Exporta TODO lo que la plataforma sabe del usuario, en un JSON legible.
// Se excluyen a propósito: el hash de la contraseña y los tokens de sesión o
// de recuperación (son credenciales, no datos del titular, y entregarlos
// sería un riesgo de seguridad, no un derecho).
const exportUserData = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, phone: true, avatar: true, role: true,
      isVerified: true, isActive: true, createdAt: true, updatedAt: true,
      whatsappNumber: true, department: true, city: true,
      googleId: true, facebookId: true,
      registrationIp: true, lastLoginIp: true,
      currentTermsAccepted: true,
    },
  })

  if (!user) {
    const error = new Error('Usuario no encontrado')
    error.status = 404
    throw error
  }

  const [
    appointments, reviews, notifications, loyaltyPoints, clientLoyalties,
    notificationPreference, waitlists, chatMessages, termsAcceptances,
    ownedShops, barberProfile,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientId: userId },
      orderBy: { date: 'desc' },
      select: {
        id: true, date: true, startTime: true, endTime: true, status: true,
        totalPrice: true, notes: true, cancelReason: true, createdAt: true,
        barbershop: { select: { name: true, address: true, city: true } },
        barber: { select: { user: { select: { name: true } } } },
        service: { select: { name: true, price: true, duration: true } },
        payment: { select: { amount: true, method: true, status: true, createdAt: true } },
      },
    }),
    prisma.review.findMany({
      where: { clientId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, rating: true, comment: true, createdAt: true,
        barbershop: { select: { name: true } },
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { title: true, body: true, type: true, isRead: true, createdAt: true },
    }),
    prisma.loyaltyPoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { points: true, description: true, createdAt: true },
    }),
    prisma.clientLoyalty.findMany({
      where: { clientId: userId },
      select: {
        totalCuts: true, freeCutsEarned: true, freeCutsUsed: true, lastVisit: true,
        barbershop: { select: { name: true } },
      },
    }),
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: {
        whatsappNumber: true, preferWhatsapp: true, preferPush: true, reminderEnabled: true,
      },
    }),
    prisma.waitlist.findMany({
      where: { clientId: userId },
      select: {
        date: true, preferredTime: true, status: true, position: true, createdAt: true,
        barbershop: { select: { name: true } },
      },
    }),
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true, content: true, intent: true, createdAt: true,
        barbershop: { select: { name: true } },
      },
    }),
    prisma.termsAcceptance.findMany({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
      select: {
        termsVersion: true, privacyVersion: true, acceptedAt: true,
        ipAddress: true, userAgent: true,
      },
    }),
    prisma.barbershop.findMany({
      where: { ownerId: userId },
      select: {
        id: true, name: true, address: true, city: true, phone: true, email: true,
        plan: true, planExpiresAt: true, isActive: true, createdAt: true,
        subscription: {
          select: {
            plan: true, status: true, startDate: true, endDate: true,
            amountPaid: true, paymentMethod: true, transactionRef: true,
          },
        },
      },
    }),
    prisma.barber.findUnique({
      where: { userId },
      select: {
        specialty: true, bio: true, isActive: true, createdAt: true,
        barbershop: { select: { name: true, address: true } },
      },
    }),
  ])

  return {
    exportInfo: {
      generatedAt: new Date().toISOString(),
      format: 'JSON',
      legalBasis: 'Derecho de portabilidad — Ley 1581 de 2012 (Colombia) y art. 20 GDPR',
      controller: 'RC Studio — Brayan Richer Claros Díaz',
      contact: 'richerclarosdiaz@gmail.com',
      note: 'No se incluyen la contraseña ni los tokens de sesión por razones de seguridad.',
    },
    profile: user,
    appointments,
    reviews,
    loyalty: { points: loyaltyPoints, programs: clientLoyalties },
    notifications,
    notificationPreference,
    waitlists,
    chatMessages,
    termsAcceptances,
    ownedBarbershops: ownedShops,
    barberProfile,
  }
}

// ─────────────────────────────────────────────────────────
// Derecho de supresión (art. 17 GDPR / Ley 1581 de 2012)
// ─────────────────────────────────────────────────────────

// Por qué anonimizar y no hacer DELETE de la fila:
// citas, pagos y suscripciones apuntan al usuario y deben conservarse 5 años
// por obligación fiscal (art. 632 del Estatuto Tributario). Borrar la fila
// rompería esas referencias. En su lugar se vacía TODO dato personal, de modo
// que los registros contables quedan sin forma de identificar a la persona.
const anonymizeUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, deletedAt: true },
  })

  if (!user) {
    const error = new Error('Usuario no encontrado')
    error.status = 404
    throw error
  }
  if (user.deletedAt) {
    const error = new Error('Esta cuenta ya fue eliminada')
    error.status = 410
    throw error
  }

  const now = new Date()
  const anonEmail = `deleted-${userId}@deleted.appestilo.co`

  await prisma.$transaction(async (tx) => {
    // 1. Cancelar citas futuras: la barbería debe liberar esos cupos.
    await tx.appointment.updateMany({
      where: {
        clientId: userId,
        date: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      data: { status: 'CANCELLED', cancelReason: 'Cuenta eliminada por el usuario' },
    })

    // 2. Borrar los datos que solo sirven mientras la cuenta existe.
    await tx.notification.deleteMany({ where: { userId } })
    await tx.chatMessage.deleteMany({ where: { userId } })
    await tx.waitlist.deleteMany({ where: { clientId: userId } })
    await tx.loyaltyPoint.deleteMany({ where: { userId } })
    await tx.clientLoyalty.deleteMany({ where: { clientId: userId } })
    await tx.notificationPreference.deleteMany({ where: { userId } })
    await tx.searchLog.updateMany({ where: { userId }, data: { userId: null } })

    // 3. Reseñas: la calificación numérica se conserva (es parte del rating
    //    público de la barbería), pero el comentario y el vínculo con la
    //    persona desaparecen al anonimizar la fila del usuario.
    await tx.review.updateMany({ where: { clientId: userId }, data: { comment: null } })

    // 4. Conservar la prueba del consentimiento (5 años) sin los datos
    //    personales que la acompañaban.
    await tx.termsAcceptance.updateMany({
      where: { userId },
      data: { ipAddress: 'anonymized', userAgent: null },
    })

    // 5. Barbero: su perfil deja de aparecer en la barbería.
    await tx.barber.updateMany({ where: { userId }, data: { isActive: false } })

    // 6. Dueño: se desactivan sus barberías y se cancela la suscripción
    //    sin penalidad. Los registros de facturación se mantienen.
    const shops = await tx.barbershop.findMany({
      where: { ownerId: userId },
      select: { id: true },
    })
    if (shops.length > 0) {
      const shopIds = shops.map(s => s.id)
      await tx.barbershop.updateMany({
        where: { id: { in: shopIds } },
        data: { isActive: false, isVisible: false, isFeatured: false },
      })
      await tx.subscription.updateMany({
        where: { barbershopId: { in: shopIds }, status: 'ACTIVE' },
        data: { status: 'CANCELLED', autoRenew: false },
      })
      await tx.barber.updateMany({
        where: { barbershopId: { in: shopIds } },
        data: { isActive: false },
      })
    }

    // 7. Vaciar el perfil. tokenVersion++ invalida cualquier JWT vigente,
    //    así que las sesiones abiertas en otros dispositivos mueren aquí.
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonEmail,
        name: 'Usuario eliminado',
        password: null,
        phone: null,
        avatar: null,
        whatsappNumber: null,
        department: null,
        city: null,
        googleId: null,
        facebookId: null,
        registrationIp: null,
        lastLoginIp: null,
        resetToken: null,
        resetTokenExpiry: null,
        deletionToken: null,
        deletionTokenExpiry: null,
        isActive: false,
        isVerified: false,
        currentTermsAccepted: false,
        deletedAt: now,
        tokenVersion: { increment: 1 },
      },
    })
  })

  return { email: user.email, name: user.name, role: user.role, deletedAt: now }
}

// Eliminación desde la app, con sesión iniciada.
// Si la cuenta tiene contraseña se exige; las cuentas de Google/Facebook no
// tienen, y en ese caso basta la palabra de confirmación que valida la ruta.
const deleteOwnAccount = async (userId, password) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, deletedAt: true },
  })

  if (!user || user.deletedAt) {
    const error = new Error('Cuenta no encontrada')
    error.status = 404
    throw error
  }

  if (user.password) {
    if (!password) {
      const error = new Error('Debes confirmar tu contraseña para eliminar la cuenta')
      error.status = 400
      throw error
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      const error = new Error('Contraseña incorrecta')
      error.status = 401
      throw error
    }
  }

  const deleted = await anonymizeUser(userId)

  // El correo es una cortesía, no parte de la transacción: si el SMTP no está
  // configurado la cuenta ya quedó eliminada igual.
  try {
    await emailService.sendAccountDeletedConfirmation(deleted.email, deleted.name)
  } catch (err) {
    console.error('[legal] No se pudo enviar el correo de confirmación de borrado:', err.message)
  }

  return { message: 'Tu cuenta fue eliminada permanentemente' }
}

// ─── Eliminación desde la web pública (sin app instalada) ───
// Paso 1: se pide el correo y se envía un enlace de confirmación.
// La respuesta es SIEMPRE la misma exista o no la cuenta: revelar qué correos
// están registrados permitiría enumerar usuarios.
const requestAccountDeletion = async (email) => {
  const genericResponse = {
    message: 'Si el correo está registrado, te enviamos un enlace para confirmar la eliminación. Revisa tu bandeja de entrada y la carpeta de spam.',
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true, name: true, deletedAt: true },
  })

  if (!user || user.deletedAt) return genericResponse

  // Se guarda el hash del token, no el token: si alguien lee la base de datos
  // no puede fabricar un enlace válido.
  const rawToken = crypto.randomBytes(32).toString('hex')
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

  await prisma.user.update({
    where: { id: user.id },
    data: {
      deletionToken: hashed,
      deletionTokenExpiry: new Date(Date.now() + DELETION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
    },
  })

  const confirmUrl = `${PUBLIC_WEB_URL}/eliminar-cuenta/confirmar?token=${rawToken}`
  try {
    await emailService.sendAccountDeletionRequest(user.email, user.name, confirmUrl, DELETION_TOKEN_TTL_HOURS)
  } catch (err) {
    console.error('[legal] No se pudo enviar el enlace de eliminación:', err.message)
    const error = new Error('No se pudo enviar el correo de confirmación. Escríbenos a richerclarosdiaz@gmail.com')
    error.status = 503
    throw error
  }

  return genericResponse
}

// Paso 2: se abre el enlace y aquí sí se ejecuta el borrado.
const confirmAccountDeletion = async (rawToken) => {
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

  const user = await prisma.user.findFirst({
    where: {
      deletionToken: hashed,
      deletionTokenExpiry: { gt: new Date() },
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!user) {
    const error = new Error('El enlace es inválido o ya expiró. Solicita uno nuevo.')
    error.status = 400
    throw error
  }

  const deleted = await anonymizeUser(user.id)

  try {
    await emailService.sendAccountDeletedConfirmation(deleted.email, deleted.name)
  } catch (err) {
    console.error('[legal] No se pudo enviar el correo de confirmación de borrado:', err.message)
  }

  return { message: 'Tu cuenta fue eliminada permanentemente' }
}

module.exports = {
  exportUserData,
  deleteOwnAccount,
  requestAccountDeletion,
  confirmAccountDeletion,
  anonymizeUser,
  DELETION_TOKEN_TTL_HOURS,
}
