const express = require('express')
const router = express.Router()
const { authMiddleware, requireRole } = require('../middleware/auth.middleware')
const { uploadLogo, uploadPhoto, uploadAvatar, uploadServiceImg, uploadAdMedia } = require('../middleware/upload.middleware')
const {
  uploadBarbershopLogoController,
  uploadBarbershopPhotoController,
  deleteBarbershopPhotoController,
  uploadBarberAvatarController,
  uploadServiceImageController,
  uploadAdMediaController
} = require('../controllers/upload.controller')

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Subida de imágenes y videos a Cloudinary
 */

/**
 * @swagger
 * /api/upload/barbershop-logo/{shopId}:
 *   post:
 *     summary: Subir logo de barbería
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "{ url, publicId }"
 *       403:
 *         description: Solo OWNER
 */
router.post('/barbershop-logo/:shopId', authMiddleware, requireRole('OWNER'), uploadLogo.single('file'), uploadBarbershopLogoController)

/**
 * @swagger
 * /api/upload/barbershop-photo/{shopId}:
 *   post:
 *     summary: Subir foto a galería de barbería
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               caption:
 *                 type: string
 *     responses:
 *       201:
 *         description: "{ url, publicId, photo }"
 *       403:
 *         description: Solo OWNER
 */
router.post('/barbershop-photo/:shopId', authMiddleware, requireRole('OWNER'), uploadPhoto.single('file'), uploadBarbershopPhotoController)

/**
 * @swagger
 * /api/upload/barbershop-photo/{photoId}:
 *   delete:
 *     summary: Eliminar foto de galería
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Foto eliminada de Cloudinary y BD
 *       403:
 *         description: Solo OWNER
 */
router.delete('/barbershop-photo/:photoId', authMiddleware, requireRole('OWNER'), deleteBarbershopPhotoController)

/**
 * @swagger
 * /api/upload/barber-avatar/{barberId}:
 *   post:
 *     summary: Subir foto de perfil del barbero
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "{ url, publicId }"
 *       403:
 *         description: Solo OWNER o BARBER
 */
router.post('/barber-avatar/:barberId', authMiddleware, requireRole('OWNER', 'BARBER'), uploadAvatar.single('file'), uploadBarberAvatarController)

/**
 * @swagger
 * /api/upload/service-image/{serviceId}:
 *   post:
 *     summary: Subir imagen de un servicio
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "{ url, publicId }"
 *       403:
 *         description: Solo OWNER
 */
router.post('/service-image/:serviceId', authMiddleware, requireRole('OWNER'), uploadServiceImg.single('file'), uploadServiceImageController)

/**
 * @swagger
 * /api/upload/ad-media/{adId}:
 *   post:
 *     summary: Subir imagen o video para un anuncio
 *     description: Detecta automáticamente si es imagen o video y actualiza mediaType
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "{ url, publicId, mediaType }"
 *       403:
 *         description: Solo OWNER
 */
router.post('/ad-media/:adId', authMiddleware, requireRole('OWNER'), uploadAdMedia.single('file'), uploadAdMediaController)

module.exports = router
