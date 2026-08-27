const express = require('express')
const router = express.Router()
const { addBarberController, getByShopController, getByIdController, getMyController, updateBarberController, getCardByUserController } = require('../controllers/barber.controller')
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
 * /api/barbers/card/{userId}:
 *   get:
 *     summary: Tarjeta del barbero por id de usuario (app móvil)
 *     description: Versión privilegiada (finanzas y teléfonos) solo para el propio barbero, su owner o admin
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de usuario del barbero
 *     responses:
 *       200:
 *         description: Tarjeta del barbero
 *       400:
 *         description: No tiene perfil de barbero
 */
router.get('/card/:userId', authMiddleware, getCardByUserController)

/**
 * @swagger
 * /api/barbers/my:
 *   get:
 *     summary: Perfil de barbero del usuario autenticado
 *     description: |
 *       Punto de entrada de las pantallas de barbero. Devuelve el id del perfil
 *       (barber.id) y el id de usuario (barber.userId): el primero lo usan
 *       calendario, ganancias y tarjeta; el segundo, /api/appointments/barber/:userId.
 *     tags: [Barbers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del barbero con su barbería y configuración
 *       404:
 *         description: El usuario no tiene perfil de barbero
 */
// Va antes de '/:id': si no, Express resuelve '/my' como un id y nunca llega aquí.
router.get('/my', authMiddleware, requireRole('BARBER'), getMyController)

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
