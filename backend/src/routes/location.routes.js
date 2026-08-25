const express = require('express')
const router = express.Router()
const { getDepartmentsController, getCitiesController } = require('../controllers/location.controller')

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Departamentos y municipios de Colombia
 */

/**
 * @swagger
 * /api/locations/departments:
 *   get:
 *     summary: Listar los 32 departamentos de Colombia
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Lista de departamentos
 */
router.get('/departments', getDepartmentsController)

/**
 * @swagger
 * /api/locations/cities/{department}:
 *   get:
 *     summary: Listar los principales municipios de un departamento
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: department
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del departamento
 *         example: "Meta"
 *     responses:
 *       200:
 *         description: Lista de municipios del departamento
 *       404:
 *         description: Departamento no encontrado
 */
router.get('/cities/:department', getCitiesController)

module.exports = router
