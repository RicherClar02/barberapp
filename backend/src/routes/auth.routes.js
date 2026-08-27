const express = require('express')
const router = express.Router()
const passport = require('../config/passport')
const {
  registerController, loginController, profileController, updateProfileController,
  forgotPasswordController, verifyResetCodeController, resetPasswordController,
  changePasswordController,
} = require('../controllers/auth.controller')
const { authMiddleware } = require('../middleware/auth.middleware')
const { registerLimiter, loginLimiter, forgotPasswordLimiter, changePasswordLimiter } = require('../middleware/rateLimiters')
const { validateRegister, validateLogin, validateForgotPassword, validateResetPassword, validateChangePassword, validateUpdateProfile } = require('../middleware/validate.middleware')

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticación y gestión de usuarios
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Juan Pérez"
 *               email:
 *                 type: string
 *                 example: "juan@email.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *               phone:
 *                 type: string
 *                 example: "3001234567"
 *               role:
 *                 type: string
 *                 enum: [CLIENT, OWNER, BARBER]
 *                 example: "CLIENT"
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos inválidos o email ya registrado
 */
router.post('/register', registerLimiter, validateRegister, registerController)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "juan@email.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login exitoso, retorna user y token JWT
 *       401:
 *         description: Credenciales incorrectas o cuenta desactivada
 */
router.post('/login', loginLimiter, validateLogin, loginController)

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del perfil del usuario
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/profile', authMiddleware, profileController)

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Actualizar perfil del usuario autenticado
 *     description: Permite guardar nombre, teléfono, avatar, WhatsApp, departamento y ciudad de residencia por defecto
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Juan Pérez"
 *               phone:
 *                 type: string
 *                 example: "3001234567"
 *               whatsappNumber:
 *                 type: string
 *                 example: "+573001234567"
 *               department:
 *                 type: string
 *                 example: "Meta"
 *               city:
 *                 type: string
 *                 example: "Villavicencio"
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Sin campos válidos para actualizar
 *       401:
 *         description: Token no proporcionado o inválido
 */
router.put('/profile', authMiddleware, validateUpdateProfile, updateProfileController)

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Iniciar autenticación con Google
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirige a Google para autenticación
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Callback de Google OAuth
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: "{ token, user }"
 *       401:
 *         description: Autenticación fallida
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/oauth-error' }),
  (req, res) => {
    const { token, user } = req.user
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } })
  }
)

/**
 * @swagger
 * /api/auth/facebook:
 *   get:
 *     summary: Iniciar autenticación con Facebook
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirige a Facebook para autenticación
 */
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }))

/**
 * @swagger
 * /api/auth/facebook/callback:
 *   get:
 *     summary: Callback de Facebook OAuth
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: "{ token, user }"
 *       401:
 *         description: Autenticación fallida
 */
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/api/auth/oauth-error' }),
  (req, res) => {
    const { token, user } = req.user
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } })
  }
)

router.get('/oauth-error', (req, res) => {
  res.status(401).json({ message: 'Error en autenticación OAuth' })
})

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar código de recuperación de contraseña
 *     tags: [Auth]
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
 *     responses:
 *       200:
 *         description: Código enviado al correo
 */
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, forgotPasswordController)

/**
 * @swagger
 * /api/auth/verify-reset-code:
 *   post:
 *     summary: Verificar código OTP de recuperación
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Código válido
 *       400:
 *         description: Código inválido o expirado
 */
router.post('/verify-reset-code', verifyResetCodeController)

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con código OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Código inválido o expirado
 */
router.post('/reset-password', validateResetPassword, resetPasswordController)

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Cambiar la contraseña con la sesión iniciada
 *     description: >
 *       Requiere la contraseña actual. Al cambiarla se incrementa tokenVersion,
 *       lo que invalida todos los JWTs anteriores (incluido el de esta request):
 *       el cliente debe volver a iniciar sesión.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: La nueva contraseña no cumple los requisitos, es igual a la actual, o la cuenta es de OAuth
 *       401:
 *         description: La contraseña actual es incorrecta, o token inválido
 *       429:
 *         description: Demasiados intentos de cambio de contraseña
 */
router.put(
  '/change-password',
  authMiddleware,
  changePasswordLimiter,
  validateChangePassword,
  changePasswordController
)

module.exports = router
