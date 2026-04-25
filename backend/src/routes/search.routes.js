const express = require('express')
const router = express.Router()
const { searchController } = require('../controllers/search.controller')

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Búsqueda global de barberías, barberos y servicios
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Búsqueda global (barberías, barberos, servicios)
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         description: Término de búsqueda
 *         schema:
 *           type: string
 *       - in: query
 *         name: lat
 *         description: Latitud para búsqueda por distancia
 *         schema:
 *           type: number
 *       - in: query
 *         name: lng
 *         description: Longitud para búsqueda por distancia
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         description: Radio en km (default 10)
 *         schema:
 *           type: number
 *       - in: query
 *         name: type
 *         description: Filtrar por tipo de resultado
 *         schema:
 *           type: string
 *           enum: [barbershop, barber, service]
 *       - in: query
 *         name: minRating
 *         description: Calificación mínima (1-5)
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         description: Precio máximo de servicio
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: "{ barbershops: [...], barbers: [...], services: [...] }"
 *       400:
 *         description: Error en parámetros de búsqueda
 */
router.get('/', searchController)

module.exports = router
