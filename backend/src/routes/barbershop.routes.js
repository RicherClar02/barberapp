const express = require('express')
const router = express.Router()
const { createController, getAllController, getByIdController, updateController, getMyBarbershopsController, getCompletenessController, resolveMapLinkController } = require('../controllers/barbershop.controller')
const { authMiddleware, optionalAuthMiddleware, requireRole } = require('../middleware/auth.middleware')
const { validateBarbershop } = require('../middleware/validate.middleware')
const { mapLinkLimiter } = require('../middleware/rateLimiters')

/**
 * @swagger
 * tags:
 *   name: Barbershops
 *   description: Gestión de barberías
 */

/**
 * @swagger
 * /api/barbershops:
 *   get:
 *     summary: Listar todas las barberías activas y visibles
 *     description: Si el usuario autenticado tiene ciudad guardada y no envía filtros, se usa su ciudad por defecto. Excluye barberías con suscripción vencida o cancelada. Orden por ciudad - PREMIUM con anuncio pagado, PREMIUM por rating, STANDARD por rating, BASIC por rating.
 *     tags: [Barbershops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filtrar por departamento
 *         example: "Meta"
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filtrar por ciudad
 *         example: "Villavicencio"
 *       - in: query
 *         name: plan
 *         schema:
 *           type: string
 *           enum: [BASIC, PREMIUM, ENTERPRISE]
 *         description: Filtrar por plan
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o dirección
 *         example: "Estilo"
 *     responses:
 *       200:
 *         description: Lista de barberías con barberos, servicios, reseñas, horarios y fotos
 *       500:
 *         description: Error del servidor
 */
router.get('/', optionalAuthMiddleware, getAllController)

/**
 * @swagger
 * /api/barbershops/{id}/completeness:
 *   get:
 *     summary: Ver % de completitud de la ficha de la barbería (OWNER)
 *     description: Ficha completa = logo + portada + descripción + dirección + lat/lng + mínimo 3 fotos + mínimo 1 servicio
 *     tags: [Barbershops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: "{ percentage, isComplete, checklist, missing }"
 *       400:
 *         description: Barbería no encontrada o sin permiso
 */
router.get('/:id/completeness', authMiddleware, requireRole('OWNER'), getCompletenessController)

/**
 * @swagger
 * /api/barbershops/owner/my-shops:
 *   get:
 *     summary: Ver mis barberías (dueño autenticado)
 *     tags: [Barbershops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de barberías del dueño con barberos, servicios y reseñas
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: Solo rol OWNER puede acceder
 */
router.get('/owner/my-shops', authMiddleware, requireRole('OWNER'), getMyBarbershopsController)

/**
 * @swagger
 * /api/barbershops/my:
 *   get:
 *     summary: Alias de /api/barbershops/owner/my-shops (usado por el panel web)
 *     tags: [Barbershops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de barberías del dueño
 *       401:
 *         description: Token no proporcionado o inválido
 *       403:
 *         description: Solo rol OWNER puede acceder
 */
router.get('/my', authMiddleware, requireRole('OWNER'), getMyBarbershopsController)

/**
 * @swagger
 * /api/barbershops/{id}:
 *   get:
 *     summary: Ver detalle completo de una barbería
 *     tags: [Barbershops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: Detalle completo con owner, barberos, servicios, reseñas, horarios y fotos
 *       404:
 *         description: Barbería no encontrada
 */
router.get('/:id', getByIdController)

/**
 * @swagger
 * /api/barbershops:
 *   post:
 *     summary: Crear una nueva barbería
 *     tags: [Barbershops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - city
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Barbería El Estilo"
 *               description:
 *                 type: string
 *                 example: "La mejor barbería de la ciudad"
 *               address:
 *                 type: string
 *                 example: "Calle 10 #5-20"
 *               city:
 *                 type: string
 *                 example: "Villavicencio"
 *               phone:
 *                 type: string
 *                 example: "3109876543"
 *               email:
 *                 type: string
 *                 example: "contacto@elestilo.com"
 *               instagram:
 *                 type: string
 *                 example: "@barberia_elestilo"
 *               latitude:
 *                 type: number
 *                 example: 4.142
 *               longitude:
 *                 type: number
 *                 example: -73.626
 *     responses:
 *       201:
 *         description: Barbería creada exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER puede crear barberías
 */
router.post('/', authMiddleware, requireRole('OWNER'), validateBarbershop, createController)

/**
 * @swagger
 * /api/barbershops/resolve-map-link:
 *   post:
 *     summary: Traducir un link de Google Maps a latitud y longitud
 *     description: >
 *       Acepta el link corto que da el botón Compartir de Maps
 *       (maps.app.goo.gl), el link largo de la barra del navegador, o unas
 *       coordenadas pegadas a mano ("4.6097, -74.0817"). Sigue el redirect
 *       solo hacia hosts de Google y rechaza puntos fuera de Colombia.
 *       No guarda nada: devuelve las coordenadas para que el dueño confirme.
 *     tags: [Barbershops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 example: "https://maps.app.goo.gl/AbCdEf123"
 *     responses:
 *       200:
 *         description: Coordenadas encontradas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                   example: 4.142
 *                 longitude:
 *                   type: number
 *                   example: -73.6266
 *       400:
 *         description: Link ilegible, ajeno a Google Maps, o ubicación fuera de Colombia
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER
 *       429:
 *         description: Demasiados intentos
 */
router.post('/resolve-map-link', authMiddleware, requireRole('OWNER'), mapLinkLimiter, resolveMapLinkController)

/**
 * @swagger
 * /api/barbershops/{id}:
 *   put:
 *     summary: Actualizar una barbería
 *     tags: [Barbershops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Barbería El Estilo Premium"
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Barbería actualizada
 *       400:
 *         description: Datos inválidos o sin permiso
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo el dueño puede editar
 */
router.put('/:id', authMiddleware, requireRole('OWNER'), validateBarbershop, updateController)

module.exports = router
