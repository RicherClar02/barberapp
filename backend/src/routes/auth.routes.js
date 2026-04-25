const express = require('express')
const router = express.Router()
const passport = require('../config/passport')
const { registerController, loginController, profileController } = require('../controllers/auth.controller')
const { authMiddleware } = require('../middleware/auth.middleware')

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
router.post('/register', registerController)

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
router.post('/login', loginController)

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

module.exports = router
