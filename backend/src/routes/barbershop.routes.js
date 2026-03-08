const express = require('express')
const router = express.Router()
const { createController, getAllController, getByIdController, updateController, getMyBarbershopsController } = require('../controllers/barbershop.controller')
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')

// Pública — cualquiera puede ver las barberías sin estar logueado
router.get('/', getAllController)
router.get('/:id', getByIdController)

// Privadas — requieren token JWT
// requireRole('OWNER') significa que solo los dueños pueden acceder
router.post('/', authMiddleware, requireRole('OWNER'), createController)
router.put('/:id', authMiddleware, requireRole('OWNER'), updateController)
router.get('/owner/my-shops', authMiddleware, requireRole('OWNER'), getMyBarbershopsController)

module.exports = router