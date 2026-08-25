const express = require('express')
const router = express.Router()
const {
  dataExportController, deleteAccountController,
  requestDeletionController, confirmDeletionController,
} = require('../controllers/user.controller')
// Perfil: /api/users/me es el nombre que citan la Política de Privacidad y las
// fichas de las tiendas. Reutiliza los controladores de auth en vez de
// duplicar la lógica; /api/auth/profile sigue funcionando igual.
const { profileController, updateProfileController } = require('../controllers/auth.controller')
const { authMiddleware } = require('../middleware/auth.middleware')
const { validateUpdateProfile } = require('../middleware/validate.middleware')
const { dataExportLimiter, accountDeletionLimiter } = require('../middleware/rateLimiters')

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Datos del usuario, portabilidad y eliminación de cuenta (derechos ARCO)
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Perfil del usuario autenticado
 *     description: Alias de /api/auth/profile — derecho de acceso (Ley 1581 de 2012).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del perfil
 *       401:
 *         description: Token no proporcionado o inválido
 */
router.get('/me', authMiddleware, profileController)

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Actualizar el perfil del usuario autenticado
 *     description: Alias de /api/auth/profile — derecho de rectificación (Ley 1581 de 2012).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               whatsappNumber: { type: string }
 *               department: { type: string }
 *               city: { type: string }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 */
router.put('/me', authMiddleware, validateUpdateProfile, updateProfileController)

/**
 * @swagger
 * /api/users/me/data-export:
 *   get:
 *     summary: Descargar todos mis datos en JSON
 *     description: Derecho de portabilidad (art. 20 GDPR / Ley 1581 de 2012). Máximo 3 descargas por día.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo JSON con todos los datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       429:
 *         description: Límite diario de descargas alcanzado
 */
router.get('/me/data-export', authMiddleware, dataExportLimiter, dataExportController)

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Eliminar mi cuenta permanentemente
 *     description: >
 *       Derecho de supresión. Requiere la contraseña (salvo cuentas de Google/Facebook)
 *       y la palabra ELIMINAR. Borra todos los datos personales; conserva anonimizados
 *       los registros de facturación exigidos por la ley colombiana.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [confirmation]
 *             properties:
 *               password:
 *                 type: string
 *                 description: Obligatoria si la cuenta tiene contraseña
 *               confirmation:
 *                 type: string
 *                 example: "ELIMINAR"
 *     responses:
 *       200:
 *         description: Cuenta eliminada
 *       400:
 *         description: Falta la confirmación o la contraseña
 *       401:
 *         description: Contraseña incorrecta
 *       410:
 *         description: La cuenta ya fue eliminada
 */
router.delete('/me', authMiddleware, deleteAccountController)

/**
 * @swagger
 * /api/users/account-deletion/request:
 *   post:
 *     summary: Solicitar la eliminación de cuenta desde la web (sin la app)
 *     description: >
 *       Público. Envía un enlace de confirmación válido por 24 horas al correo registrado.
 *       La respuesta es la misma exista o no la cuenta, para no revelar qué correos están
 *       registrados. Requisito de Google Play desde 2024.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "juan@email.com"
 *     responses:
 *       200:
 *         description: Si el correo existe, se envió el enlace
 *       429:
 *         description: Demasiadas solicitudes
 *       503:
 *         description: El envío de correos no está configurado
 */
router.post('/account-deletion/request', accountDeletionLimiter, requestDeletionController)

/**
 * @swagger
 * /api/users/account-deletion/confirm:
 *   post:
 *     summary: Confirmar la eliminación con el token del correo
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cuenta eliminada
 *       400:
 *         description: Token inválido o expirado
 */
router.post('/account-deletion/confirm', accountDeletionLimiter, confirmDeletionController)

module.exports = router
