const express = require('express')
const router = express.Router()
const {
  acceptTermsController, currentVersionsController,
  getDocumentController, acceptanceStatusController,
} = require('../controllers/legal.controller')
const { authMiddleware } = require('../middleware/auth.middleware')

/**
 * @swagger
 * tags:
 *   name: Legal
 *   description: Términos, privacidad y registro de aceptación (Ley 1581 de 2012)
 */

/**
 * @swagger
 * /api/legal/current-versions:
 *   get:
 *     summary: Versiones vigentes de los documentos legales
 *     description: Público. Devuelve la versión de cada documento y la URL donde leerlo sin iniciar sesión.
 *     tags: [Legal]
 *     responses:
 *       200:
 *         description: "{ terms, privacy, cookies, accountDeletion }"
 */
router.get('/current-versions', currentVersionsController)

/**
 * @swagger
 * /api/legal/documents/{slug}:
 *   get:
 *     summary: Texto completo de un documento legal en markdown
 *     description: Público. Fuente única para la app móvil y el panel web.
 *     tags: [Legal]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *           enum: [terms, privacy, cookies, account-deletion]
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           enum: [es, en]
 *         description: "Idioma (por defecto es). Si falta la traducción se devuelve el español."
 *     responses:
 *       200:
 *         description: "{ slug, lang, version, title, url, content }"
 *       404:
 *         description: Documento no encontrado
 */
router.get('/documents/:slug', getDocumentController)

/**
 * @swagger
 * /api/legal/accept-terms:
 *   post:
 *     summary: Registrar la aceptación de términos y privacidad
 *     description: Guarda la versión aceptada junto con la IP y el User-Agent como prueba del consentimiento.
 *     tags: [Legal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [termsVersion, privacyVersion]
 *             properties:
 *               termsVersion:
 *                 type: string
 *                 example: "1.0"
 *               privacyVersion:
 *                 type: string
 *                 example: "1.0"
 *     responses:
 *       201:
 *         description: Aceptación registrada
 *       400:
 *         description: Faltan versiones
 *       409:
 *         description: Las versiones enviadas no son las vigentes
 */
router.post('/accept-terms', authMiddleware, acceptTermsController)

/**
 * @swagger
 * /api/legal/acceptance-status:
 *   get:
 *     summary: Saber si el usuario aceptó la versión vigente
 *     tags: [Legal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "{ accepted, needsAcceptance, lastAcceptance, currentVersions }"
 */
router.get('/acceptance-status', authMiddleware, acceptanceStatusController)

module.exports = router
