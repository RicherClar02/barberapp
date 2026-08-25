const prisma = require('../lib/prisma')

// "Row Level Security" a nivel de aplicación: guards reutilizables y
// auditables que se montan en las rutas DESPUÉS de authMiddleware.
// ADMIN siempre pasa (es el rol de plataforma).

// Valida que req.user sea el dueño de la barbería del recurso
const requireShopOwnership = (paramName = 'shopId') => async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') return next()

    const shopId = req.params[paramName]
    if (!shopId) return res.status(400).json({ message: `Falta el parámetro ${paramName}` })

    const shop = await prisma.barbershop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    })
    if (!shop) return res.status(404).json({ message: 'Barbería no encontrada' })
    if (shop.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso sobre esta barbería' })
    }
    next()
  } catch (error) {
    next(error)
  }
}

// Valida que el barbero solo acceda a SUS datos
// (o que el solicitante sea el owner de su barbería)
const requireBarberSelf = (paramName = 'barberId') => async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') return next()

    const barberId = req.params[paramName]
    if (!barberId) return res.status(400).json({ message: `Falta el parámetro ${paramName}` })

    const barber = await prisma.barber.findUnique({
      where: { id: barberId },
      select: { userId: true, barbershop: { select: { ownerId: true } } },
    })
    if (!barber) return res.status(404).json({ message: 'Barbero no encontrado' })

    const isSelf = req.user.role === 'BARBER' && barber.userId === req.user.id
    const isOwner = req.user.role === 'OWNER' && barber.barbershop.ownerId === req.user.id
    if (!isSelf && !isOwner) {
      return res.status(403).json({ message: 'No tienes permiso para ver los datos de este barbero' })
    }
    next()
  } catch (error) {
    next(error)
  }
}

// Solo el cliente de la cita, el barbero asignado o el owner de esa barbería
const requireAppointmentParticipant = (paramName = 'id') => async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') return next()

    const appointmentId = req.params[paramName]
    if (!appointmentId) return res.status(400).json({ message: `Falta el parámetro ${paramName}` })

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        clientId: true,
        barber: { select: { userId: true } },
        barbershop: { select: { ownerId: true } },
      },
    })
    if (!appointment) return res.status(404).json({ message: 'Cita no encontrada' })

    const isClient = appointment.clientId === req.user.id
    const isBarber = appointment.barber.userId === req.user.id
    const isOwner = appointment.barbershop.ownerId === req.user.id
    if (!isClient && !isBarber && !isOwner) {
      return res.status(403).json({ message: 'No participas en esta cita' })
    }
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = { requireShopOwnership, requireBarberSelf, requireAppointmentParticipant }
