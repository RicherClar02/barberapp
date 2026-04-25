const express = require('express')
const router = express.Router()
const { addBarberController, getByShopController, getByIdController, updateBarberController } = require('../controllers/barber.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Barbers
 *   description: Gestión de barberos por barbería
 */

/**
 * @swagger
 * /api/barbers/shop/{shopId}:
 *   get:
 *     summary: Listar barberos de una barbería
 *     tags: [Barbers]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: Lista de barberos activos con info de usuario y rating
 *       500:
 *         description: Error del servidor
 */
router.get('/shop/:shopId', getByShopController)

/**
 * @swagger
 * /api/barbers/{id}:
 *   get:
 *     summary: Ver perfil completo de un barbero
 *     tags: [Barbers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del barbero
 *     responses:
 *       200:
 *         description: Perfil del barbero con barbería y últimas 10 reseñas
 *       404:
 *         description: Barbero no encontrado
 */
router.get('/:id', getByIdController)

/**
 * @swagger
 * /api/barbers:
 *   post:
 *     summary: Agregar un barbero a una barbería
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - barbershopId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID del usuario con rol BARBER
 *                 example: "uuid-del-usuario-barbero"
 *               barbershopId:
 *                 type: string
 *                 description: ID de la barbería
 *                 example: "uuid-de-la-barberia"
 *               specialty:
 *                 type: string
 *                 example: "Degradados y diseños"
 *               bio:
 *                 type: string
 *                 example: "5 años de experiencia en cortes modernos"
 *     responses:
 *       201:
 *         description: Barbero agregado exitosamente
 *       400:
 *         description: Error de validación (usuario no existe, no es BARBER, ya pertenece, sin permiso)
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo rol OWNER puede agregar barberos
 */
router.post('/', authMiddleware, requireRole('OWNER'), addBarberController)

/**
 * @swagger
 * /api/barbers/{id}:
 *   put:
 *     summary: Actualizar datos de un barbero
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del barbero
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               specialty:
 *                 type: string
 *                 example: "Barbas y cortes clásicos"
 *               bio:
 *                 type: string
 *                 example: "Especialista en barbas desde 2018"
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Barbero actualizado
 *       400:
 *         description: Sin permiso o barbero no encontrado
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo el dueño de la barbería puede editar
 */
router.put('/:id', authMiddleware, requireRole('OWNER'), updateBarberController)

module.exports = router
