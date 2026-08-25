const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

// All admin routes require authentication + ADMIN role
router.use(authMiddleware, requireRole('ADMIN'))

/**
 * @swagger
 * /api/admin/pending-users:
 *   get:
 *     summary: Listar usuarios BARBER/OWNER pendientes de aprobación
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios pendientes
 */
router.get('/pending-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isVerified: false,
        isActive: true,
        role: { in: ['BARBER', 'OWNER'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    })
    res.json({ users })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Listar todos los usuarios
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users', async (req, res) => {
  try {
    const { role, isVerified, page = 1, limit = 20 } = req.query
    const where = {}
    if (role) where.role = role
    if (isVerified !== undefined) where.isVerified = isVerified === 'true'

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true,
          role: true, isVerified: true, isActive: true, createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ])
    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/admin/users/{id}/approve:
 *   put:
 *     summary: Aprobar cuenta de barbero u dueño
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put('/users/:id/approve', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified: true },
      select: { id: true, name: true, email: true, role: true, isVerified: true }
    })
    res.json({ message: 'Cuenta aprobada', user })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/admin/users/{id}/reject:
 *   put:
 *     summary: Rechazar/desactivar cuenta pendiente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put('/users/:id/reject', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    })
    res.json({ message: 'Cuenta rechazada', user })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/admin/users/{id}/toggle-active:
 *   put:
 *     summary: Activar o desactivar cuenta de usuario
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const current = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { isActive: true }
    })
    if (!current) return res.status(404).json({ message: 'Usuario no encontrado' })

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !current.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    })
    res.json({ message: `Cuenta ${user.isActive ? 'activada' : 'desactivada'}`, user })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/admin/ads:
 *   get:
 *     summary: Listar todos los anuncios (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/ads', async (req, res) => {
  try {
    const { status, page = 1, limit = 15 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = {}
    if (status === 'PENDING') { where.isPaid = false; where.isActive = true }
    else if (status === 'ACTIVE') { where.isPaid = true; where.isActive = true }
    else if (status === 'EXPIRED') { where.isActive = false }

    const [ads, total] = await Promise.all([
      prisma.advertisement.findMany({
        where,
        include: { barbershop: { select: { id: true, name: true, city: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.advertisement.count({ where })
    ])
    res.json({ ads, total })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/admin/subscriptions/{id}/activate:
 *   put:
 *     summary: Activar manualmente una suscripción vencida
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.put('/subscriptions/:id/activate', async (req, res) => {
  try {
    const { months = 1 } = req.body
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { barbershop: true }
    })
    if (!sub) return res.status(404).json({ message: 'Suscripción no encontrada' })

    const newEnd = new Date()
    newEnd.setMonth(newEnd.getMonth() + parseInt(months))

    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE', endDate: newEnd },
      include: { barbershop: { select: { name: true } } }
    })
    res.json({ message: 'Suscripción activada', subscription: updated })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

// ─── MODERACIÓN DE RESEÑAS (anti-fraude) ───────────────────────────────────

/**
 * @swagger
 * /api/admin/flagged-reviews:
 *   get:
 *     summary: Listar reseñas marcadas como sospechosas con motivo, cliente y barbería
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reseñas flagged pendientes de moderación
 */
router.get('/flagged-reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { flagged: true },
      include: {
        client: { select: { id: true, name: true, email: true, createdAt: true, registrationIp: true, isActive: true } },
        barbershop: { select: { id: true, name: true, city: true } },
        appointment: { select: { date: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ reviews, total: reviews.length })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/admin/reviews/{id}/approve:
 *   put:
 *     summary: Aprobar una reseña flagged (vuelve a contar para el rating)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reseña aprobada
 */
router.put('/reviews/:id/approve', async (req, res) => {
  try {
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { flagged: false, flagReason: null }
    })
    res.json({ message: 'Reseña aprobada: ya cuenta para el rating', review })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/admin/reviews/{id}:
 *   delete:
 *     summary: Eliminar una reseña fraudulenta (opcionalmente suspender la cuenta)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               suspendUser:
 *                 type: boolean
 *                 description: Si es true, suspende también la cuenta del cliente falso
 *     responses:
 *       200:
 *         description: Reseña eliminada
 */
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } })
    if (!review) return res.status(404).json({ message: 'Reseña no encontrada' })

    await prisma.review.delete({ where: { id: req.params.id } })

    let suspended = false
    if (req.body?.suspendUser === true) {
      await prisma.user.update({
        where: { id: review.clientId },
        data: { isActive: false }
      })
      suspended = true
    }

    res.json({
      message: suspended
        ? 'Reseña eliminada y cuenta del cliente suspendida'
        : 'Reseña eliminada'
    })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

module.exports = router
