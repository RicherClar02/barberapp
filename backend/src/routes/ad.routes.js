const express = require('express')
const router = express.Router()
const {
  getActiveController,
  clickController,
  createController,
  updateController,
  activateController,
  getShopAdsController,
  deleteController
} = require('../controllers/ad.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Ads
 *   description: Publicidad y anuncios de barberías
 */

/**
 * @swagger
 * /api/ads/active:
 *   get:
 *     summary: Ver anuncios activos y vigentes
 *     description: Retorna anuncios pagados, activos y con fecha vigente. Ordenados aleatoriamente. Incrementa views.
 *     tags: [Ads]
 *     responses:
 *       200:
 *         description: Lista de anuncios activos con info de barbería
 *       500:
 *         description: Error del servidor
 */
router.get('/active', getActiveController)

/**
 * @swagger
 * /api/ads/click/{id}:
 *   post:
 *     summary: Registrar click en un anuncio
 *     tags: [Ads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del anuncio
 *     responses:
 *       200:
 *         description: Click registrado
 *       400:
 *         description: Anuncio no encontrado
 */
router.post('/click/:id', clickController)

/**
 * @swagger
 * /api/ads:
 *   post:
 *     summary: Crear un anuncio
 *     description: "El anuncio se crea con isPaid=false. Debe ser activado por un ADMIN."
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barbershopId
 *               - title
 *               - mediaUrl
 *               - mediaType
 *               - startsAt
 *               - endsAt
 *             properties:
 *               barbershopId:
 *                 type: string
 *                 example: "uuid-de-la-barberia"
 *               title:
 *                 type: string
 *                 example: "Promoción de verano - 20% OFF"
 *               mediaUrl:
 *                 type: string
 *                 example: "https://res.cloudinary.com/demo/video/upload/promo.mp4"
 *               mediaType:
 *                 type: string
 *                 enum: [video, image]
 *                 example: "video"
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-07-01T00:00:00Z"
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-07-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Anuncio creado (pendiente de activación por admin)
 *       400:
 *         description: Datos inválidos o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.post('/', authMiddleware, requireRole('OWNER'), createController)

/**
 * @swagger
 * /api/ads/shop/{shopId}:
 *   get:
 *     summary: Ver todos los anuncios de una barbería
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: Lista de anuncios con stats (views, clicks, fechas, estado)
 *       400:
 *         description: Sin permiso sobre la barbería
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.get('/shop/:shopId', authMiddleware, requireRole('OWNER'), getShopAdsController)

/**
 * @swagger
 * /api/ads/{id}:
 *   put:
 *     summary: Editar un anuncio propio
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del anuncio
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               mediaUrl:
 *                 type: string
 *               mediaType:
 *                 type: string
 *                 enum: [video, image]
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Anuncio actualizado
 *       400:
 *         description: Anuncio no encontrado o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 */
router.put('/:id', authMiddleware, requireRole('OWNER'), updateController)

/**
 * @swagger
 * /api/ads/{id}/activate:
 *   put:
 *     summary: Activar anuncio y marcar como pagado
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del anuncio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amountPaid
 *             properties:
 *               amountPaid:
 *                 type: number
 *                 example: 150000
 *     responses:
 *       200:
 *         description: Anuncio activado y pagado
 *       400:
 *         description: Anuncio no encontrado o amountPaid faltante
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol ADMIN
 */
router.put('/:id/activate', authMiddleware, requireRole('ADMIN'), activateController)

/**
 * @swagger
 * /api/ads/{id}:
 *   delete:
 *     summary: Desactivar un anuncio
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del anuncio
 *     responses:
 *       200:
 *         description: Anuncio desactivado
 *       400:
 *         description: Anuncio no encontrado o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo OWNER o ADMIN
 */
router.delete('/:id', authMiddleware, requireRole('OWNER', 'ADMIN'), deleteController)

module.exports = router
