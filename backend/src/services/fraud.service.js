const prisma = require('../lib/prisma')

// Detección de patrones sospechosos en reseñas (anti-inflado de ratings).
// Retorna { flagged: boolean, reason: string|null }. No lanza errores:
// la reseña se crea igual pero marcada para revisión del ADMIN.
const checkReviewFraud = async (clientId, barbershopId, rating) => {
  const reasons = []

  // 1. Más de 3 reseñas del mismo cliente a la misma barbería en 30 días
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentCount = await prisma.review.count({
    where: { clientId, barbershopId, createdAt: { gte: thirtyDaysAgo } },
  })
  if (recentCount >= 3) {
    reasons.push(`${recentCount + 1} reseñas a la misma barbería en 30 días`)
  }

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { createdAt: true, registrationIp: true },
  })

  // 2. Cuenta creada hace menos de 24h dejando reseña 5★
  if (client) {
    const accountAgeMs = Date.now() - new Date(client.createdAt).getTime()
    if (accountAgeMs < 24 * 60 * 60 * 1000 && rating === 5) {
      reasons.push('Cuenta creada hace menos de 24h dejando reseña 5★')
    }

    // 3. Varias cuentas desde la misma IP reseñando la misma barbería
    if (client.registrationIp) {
      const sameIpReviewers = await prisma.review.count({
        where: {
          barbershopId,
          clientId: { not: clientId },
          client: { registrationIp: client.registrationIp },
        },
      })
      if (sameIpReviewers >= 1) {
        reasons.push(`Otra(s) ${sameIpReviewers} cuenta(s) con la misma IP ya reseñaron esta barbería`)
        logSuspiciousIp(client.registrationIp, `Multi-cuenta reseñando barbería ${barbershopId}`)
      }
    }
  }

  return {
    flagged: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join(' | ') : null,
  }
}

// Más de 3 cuentas registradas desde la misma IP en 24h → sospechoso.
// Retorna true si la IP está bajo sospecha (la cuenta nueva queda sin verificar).
const checkRegistrationIpAbuse = async (ip) => {
  if (!ip) return false
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const count = await prisma.user.count({
    where: { registrationIp: ip, createdAt: { gte: dayAgo } },
  })
  if (count >= 3) {
    logSuspiciousIp(ip, `${count + 1} registros en 24h desde la misma IP`)
    return true
  }
  return false
}

module.exports = { checkReviewFraud, checkRegistrationIpAbuse }
