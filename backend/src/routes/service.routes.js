const express = require('express')
const router = express.Router()
const { createController, getByShopController, updateController, deleteController } = require('../controllers/service.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

// Pública — cualquiera puede ver el catálogo de servicios
router.get('/shop/:shopId', getByShopController)

// Privadas — solo el dueño gestiona los servicios
router.post('/', authMiddleware, requireRole('OWNER'), createController)
router.put('/:id', authMiddleware, requireRole('OWNER'), updateController)
router.delete('/:id', authMiddleware, requireRole('OWNER'), deleteController)

module.exports = router