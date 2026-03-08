const express = require('express')
const router = express.Router()
const { addBarberController, getByShopController, getByIdController, updateBarberController } = require('../controllers/barber.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

// Públicas — cualquiera puede ver los barberos de una barbería
router.get('/shop/:shopId', getByShopController)
router.get('/:id', getByIdController)

// Privadas — solo el dueño puede agregar o editar barberos
router.post('/', authMiddleware, requireRole('OWNER'), addBarberController)
router.put('/:id', authMiddleware, requireRole('OWNER'), updateBarberController)

module.exports = router