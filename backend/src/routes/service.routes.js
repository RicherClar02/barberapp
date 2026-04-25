const express = require('express')
const router = express.Router()
const { createController, getByShopController, updateController, deleteController } = require('../controllers/service.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Catálogo de servicios por barbería
 */

/**
 * @swagger
 * /api/services/shop/{shopId}:
 *   get:
 *     summary: Ver catálogo de servicios de una barbería
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la barbería
 *     responses:
 *       200:
 *         description: Lista de servicios activos ordenados por precio
 *       500:
 *         description: Error del servidor
 */
router.get('/shop/:shopId', getByShopController)

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Crear un nuevo servicio
 *     tags: [Services]
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
 *               - name
 *               - price
 *               - duration
 *             properties:
 *               barbershopId:
 *                 type: string
 *                 example: "uuid-de-la-barberia"
 *               name:
 *                 type: string
 *                 example: "Corte Clásico"
 *               description:
 *                 type: string
 *                 example: "Corte tradicional con tijera"
 *               price:
 *                 type: number
 *                 example: 25000
 *               duration:
 *                 type: integer
 *                 description: Duración en minutos
 *                 example: 30
 *               image:
 *                 type: string
 *                 example: "https://ejemplo.com/corte.jpg"
 *     responses:
 *       201:
 *         description: Servicio creado exitosamente
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
 * /api/services/{id}:
 *   put:
 *     summary: Actualizar un servicio
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del servicio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Corte Premium"
 *               price:
 *                 type: number
 *                 example: 35000
 *               duration:
 *                 type: integer
 *                 example: 45
 *     responses:
 *       200:
 *         description: Servicio actualizado
 *       400:
 *         description: Sin permiso o servicio no encontrado
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo el dueño puede editar
 */
router.put('/:id', authMiddleware, requireRole('OWNER'), updateController)

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Eliminar un servicio (soft delete)
 *     description: Marca el servicio como inactivo para preservar historial de citas
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del servicio
 *     responses:
 *       200:
 *         description: Servicio eliminado (desactivado)
 *       400:
 *         description: Sin permiso o servicio no encontrado
 *       401:
 *         description: Token no proporcionado
 *       403:
 *         description: Solo el dueño puede eliminar
 */
router.delete('/:id', authMiddleware, requireRole('OWNER'), deleteController)

module.exports = router
