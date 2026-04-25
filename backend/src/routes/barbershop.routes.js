const express = require('express')
const router = express.Router()
const { createController, getAllController, getByIdController, updateController, getMyBarbershopsController } = require('../controllers/barbershop.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

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
 *     summary: Listar todas las barberías activas
 *     tags: [Barbershops]
 *     parameters:
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
router.get('/', getAllController)

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
router.post('/', authMiddleware, requireRole('OWNER'), createController)

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
router.put('/:id', authMiddleware, requireRole('OWNER'), updateController)

module.exports = router
