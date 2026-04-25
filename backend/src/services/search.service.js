const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Fórmula de Haversine para distancia en km
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const globalSearch = async (params, userId) => {
  const { q = '', city, lat, lng, radius = 50, minRating, maxPrice, plan, available } = params

  if (!q && !city) throw new Error('Proporciona un término de búsqueda (q) o ciudad')

  const qLower = q.toLowerCase()

  // Buscar barberías
  const barbershopWhere = { isActive: true }
  if (city) barbershopWhere.city = { contains: city, mode: 'insensitive' }
  if (plan) barbershopWhere.plan = plan
  if (q) barbershopWhere.name = { contains: q, mode: 'insensitive' }

  let barbershops = await prisma.barbershop.findMany({
    where: barbershopWhere,
    include: {
      reviews: { select: { rating: true } },
      barbers: { where: { isActive: true }, select: { id: true } },
      services: { where: { isActive: true }, select: { price: true } }
    },
    take: 50
  })

  // Filtrar por rating mínimo
  if (minRating) {
    barbershops = barbershops.filter(b => {
      const avg = b.reviews.length > 0 ? b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length : 0
      return avg >= parseFloat(minRating)
    })
  }

  // Filtrar por precio máximo de servicios
  if (maxPrice) {
    barbershops = barbershops.filter(b => b.services.some(s => s.price <= parseFloat(maxPrice)))
  }

  // Filtrar por disponibilidad hoy
  if (available === 'true') {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setUTCHours(23, 59, 59, 999)

    barbershops = await Promise.all(
      barbershops.map(async b => {
        const slots = await prisma.appointment.count({
          where: { barbershopId: b.id, date: { gte: today, lte: todayEnd }, status: { in: ['PENDING', 'CONFIRMED'] } }
        })
        return { ...b, _hasSlots: slots < b.barbers.length * 8 }
      })
    )
    barbershops = barbershops.filter(b => b._hasSlots)
  }

  // Calcular distancia y ordenar si hay lat/lng
  let shopResults = barbershops.map(b => {
    const rating = b.reviews.length > 0
      ? Math.round(b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length * 10) / 10
      : 0
    const result = {
      id: b.id, name: b.name, city: b.city, address: b.address,
      logo: b.logo, plan: b.plan, rating, totalReviews: b.reviews.length
    }
    if (lat && lng && b.latitude && b.longitude) {
      result.distanceKm = Math.round(haversine(parseFloat(lat), parseFloat(lng), b.latitude, b.longitude) * 10) / 10
    }
    return result
  })

  if (lat && lng) {
    shopResults = shopResults
      .filter(b => b.distanceKm === undefined || b.distanceKm <= parseFloat(radius))
      .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
  }

  shopResults = shopResults.slice(0, 10)

  // Buscar barberos por nombre
  const barberResults = q ? await prisma.barber.findMany({
    where: {
      isActive: true,
      user: { name: { contains: q, mode: 'insensitive' } },
      ...(city ? { barbershop: { city: { contains: city, mode: 'insensitive' } } } : {})
    },
    include: {
      user: { select: { name: true, avatar: true } },
      barbershop: { select: { name: true, city: true } },
      reviews: { select: { rating: true } }
    },
    take: 5
  }) : []

  // Buscar servicios por nombre
  const serviceResults = q ? await prisma.service.findMany({
    where: {
      isActive: true,
      name: { contains: q, mode: 'insensitive' },
      ...(maxPrice ? { price: { lte: parseFloat(maxPrice) } } : {})
    },
    include: {
      barbershop: { select: { id: true, name: true, city: true } }
    },
    take: 5
  }) : []

  const total = shopResults.length + barberResults.length + serviceResults.length

  // Guardar en SearchLog
  await prisma.searchLog.create({
    data: {
      query: q || city || '',
      city: city || null,
      userId: userId || null,
      results: total
    }
  })

  return {
    barbershops: shopResults,
    barbers: barberResults.map(b => ({
      id: b.id,
      name: b.user.name,
      avatar: b.user.avatar,
      specialty: b.specialty,
      barbershopName: b.barbershop.name,
      city: b.barbershop.city,
      rating: b.reviews.length > 0 ? Math.round(b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length * 10) / 10 : 0
    })),
    services: serviceResults.map(s => ({
      id: s.id, name: s.name, price: s.price, duration: s.duration,
      barbershopId: s.barbershop.id, barbershopName: s.barbershop.name, city: s.barbershop.city
    })),
    total
  }
}

module.exports = { globalSearch }
