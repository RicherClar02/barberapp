const prisma = require('../lib/prisma')

// Campos que el dueño puede enviar al crear su barbería. Todo lo demás que
// venga en el body se descarta en silencio: `plan`, `planExpiresAt`,
// `isFeatured`, `isVerified`, `isVisible` e `isActive` los gobierna el sistema
// (suscripción y moderación), nunca el cliente. `ownerId` sale del token.
const CREATE_BARBERSHOP_FIELDS = [
  'name', 'description', 'address', 'city', 'department', 'locality',
  'amenities', 'latitude', 'longitude', 'phone', 'email',
  'instagram', 'facebook', 'logo', 'coverImage'
]

// Al editar se permite exactamente lo mismo que al crear: no hay ningún campo
// que solo tenga sentido en la edición.
const UPDATE_BARBERSHOP_FIELDS = CREATE_BARBERSHOP_FIELDS

// Crea una barbería nueva en la base de datos
// Solo los usuarios con rol OWNER pueden hacer esto
const createBarbershop = async (data, ownerId) => {
  const createData = {}
  for (const field of CREATE_BARBERSHOP_FIELDS) {
    if (data[field] !== undefined) createData[field] = data[field]
  }

  const barbershop = await prisma.barbershop.create({
    data: {
      ...createData,
      ownerId
    }
  })
  return barbershop
}

// Regla de negocio: rating < 3.0 con mínimo 5 reseñas = alerta de rating bajo
const isLowRating = (avgRating, totalReviews) => totalReviews >= 5 && avgRating < 3.0

// Trae todas las barberías activas y visibles ordenadas por prioridad
// dentro de cada ciudad:
// 1. PREMIUM con anuncio activo pagado, 2. PREMIUM por rating,
// 3. STANDARD por rating, 4. BASIC por rating
// Si el usuario autenticado tiene ciudad guardada y no envía filtros,
// se usa su ciudad por defecto (siempre puede cambiarla con ?city=)
const getAllBarbershops = async (filters = {}, user = null) => {
  let { department, city, plan, search } = filters
  const now = new Date()

  // Ciudad por defecto del usuario autenticado (caso: no envió filtros)
  if (!city && !department && !search && user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { city: true, department: true }
    })
    if (dbUser?.city) {
      city = dbUser.city
      department = dbUser.department || undefined
    }
  }

  const barbershops = await prisma.barbershop.findMany({
    where: {
      isActive: true,
      isVisible: true,
      ...(department && { department: { equals: department, mode: 'insensitive' } }),
      ...(city && { city: { equals: city, mode: 'insensitive' } }),
      ...(plan && { plan }),
      AND: [
        ...(search ? [{
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } }
          ]
        }] : []),
        // Excluir barberías con suscripción vencida o cancelada
        {
          OR: [
            { subscription: null },
            { subscription: { status: { notIn: ['EXPIRED', 'CANCELLED'] } } }
          ]
        }
      ]
    },
    include: {
      barbers: {
        where: { isActive: true },
        include: { user: { select: { name: true, avatar: true } } }
      },
      services: { where: { isActive: true } },
      // Anti-fraude: solo reseñas verificadas (no flagged) cuentan para el rating
      reviews: { where: { flagged: false }, select: { rating: true } },
      schedules: true,
      photos: true,
      advertisements: {
        where: { isActive: true, isPaid: true, startsAt: { lte: now }, endsAt: { gte: now } },
        select: { id: true }
      }
    }
  })

  // Completitud de ficha aproximada (0..1) para ordenar barberías nuevas
  const completenessScore = (b) => {
    const checks = [
      !!b.logo, !!b.coverImage, !!b.description, !!b.address,
      b.latitude != null && b.longitude != null,
      b.photos.length >= 3, b.services.length >= 1
    ]
    return checks.filter(Boolean).length / checks.length
  }

  const MIN_REVIEWS_FOR_RANKING = 5

  const withRating = barbershops.map(b => {
    const avgRating = b.reviews.length ? b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length : 0
    return {
      ...b,
      avgRating,
      lowRating: isLowRating(avgRating, b.reviews.length),
      hasActiveAd: b.advertisements.length > 0,
      _hasRankingRating: b.reviews.length >= MIN_REVIEWS_FOR_RANKING,
      _completeness: completenessScore(b)
    }
  })

  // Orden: PREMIUM+ad pagado > PREMIUM > STANDARD > BASIC.
  // Dentro de cada nivel: rating desc SOLO si tiene mínimo 5 reseñas
  // verificadas; las que no llegan a 5 van después, ordenadas por
  // completitud de ficha (protección anti-inflado de ratings).
  const planOrder = { PREMIUM: 0, STANDARD: 1, BASIC: 2 }
  withRating.sort((a, b) => {
    const aPriority = planOrder[a.plan] ?? 3
    const bPriority = planOrder[b.plan] ?? 3
    if (aPriority !== bPriority) return aPriority - bPriority
    if (a.plan === 'PREMIUM' && a.hasActiveAd !== b.hasActiveAd) return a.hasActiveAd ? -1 : 1
    if (a._hasRankingRating !== b._hasRankingRating) return a._hasRankingRating ? -1 : 1
    if (a._hasRankingRating) return b.avgRating - a.avgRating
    return b._completeness - a._completeness
  })

  return withRating
}

// Trae el detalle completo de UNA barbería por su ID
// Se usa cuando el cliente toca una barbería para ver su perfil
const getBarbershopById = async (id) => {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      barbers: {
        where: { isActive: true },
        include: { user: { select: { name: true, avatar: true } } }
      },
      services: { where: { isActive: true } },
      reviews: {
        where: { flagged: false },
        include: { client: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' }
      },
      schedules: true,
      photos: true
    }
  })

  if (!barbershop) throw new Error('Barbería no encontrada')

  const avgRating = barbershop.reviews.length
    ? barbershop.reviews.reduce((s, r) => s + r.rating, 0) / barbershop.reviews.length
    : 0

  return {
    ...barbershop,
    avgRating: Math.round(avgRating * 10) / 10,
    lowRating: isLowRating(avgRating, barbershop.reviews.length)
  }
}

// Actualiza los datos de una barbería
// Solo el dueño de esa barbería puede editarla
const updateBarbershop = async (id, data, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({ where: { id } })

  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso para editar esta barbería')

  // `ownerId` queda fuera de la allowlist a propósito: el permiso de arriba se
  // comprueba contra el dueño ACTUAL, así que aceptarlo aquí permitiría
  // transferir la barbería a un tercero justo después de pasar el control.
  const updateData = {}
  for (const field of UPDATE_BARBERSHOP_FIELDS) {
    if (data[field] !== undefined) updateData[field] = data[field]
  }

  return await prisma.barbershop.update({
    where: { id },
    data: updateData
  })
}

// Trae todas las barberías que pertenecen a un dueño específico
// Se usa en el panel de administración del dueño
const getMyBarbershops = async (ownerId) => {
  return await prisma.barbershop.findMany({
    where: { ownerId },
    include: {
      barbers: true,
      services: true,
      reviews: { select: { rating: true } },
      subscription: { select: { status: true, endDate: true, plan: true } }
    }
  })
}

// Calcula el % de completitud de la ficha de la barbería (solo OWNER)
// Ficha completa: logo + portada + descripción + dirección + lat/lng
// + mínimo 3 fotos + mínimo 1 servicio
const getCompleteness = async (id, ownerId) => {
  const barbershop = await prisma.barbershop.findUnique({
    where: { id },
    include: {
      photos: { select: { id: true } },
      services: { where: { isActive: true }, select: { id: true } }
    }
  })

  if (!barbershop) throw new Error('Barbería no encontrada')
  if (barbershop.ownerId !== ownerId) throw new Error('No tienes permiso sobre esta barbería')

  const checklist = [
    { key: 'logo', label: 'Logo', done: !!barbershop.logo },
    { key: 'coverImage', label: 'Foto de portada', done: !!barbershop.coverImage },
    { key: 'description', label: 'Descripción', done: !!barbershop.description },
    { key: 'address', label: 'Dirección', done: !!barbershop.address },
    { key: 'location', label: 'Ubicación en el mapa (lat/lng)', done: barbershop.latitude != null && barbershop.longitude != null },
    { key: 'photos', label: 'Mínimo 3 fotos', done: barbershop.photos.length >= 3 },
    { key: 'services', label: 'Mínimo 1 servicio', done: barbershop.services.length >= 1 }
  ]

  const completed = checklist.filter(c => c.done).length
  const percentage = Math.round((completed / checklist.length) * 100)

  return {
    percentage,
    isComplete: percentage === 100,
    checklist,
    missing: checklist.filter(c => !c.done).map(c => c.label)
  }
}

module.exports = { createBarbershop, getAllBarbershops, getBarbershopById, updateBarbershop, getMyBarbershops, getCompleteness, isLowRating }