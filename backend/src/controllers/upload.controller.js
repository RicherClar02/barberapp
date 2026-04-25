const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')
const cloudinary = require('../config/cloudinary')
const { uploadToCloudinary, extractPublicId } = require('../middleware/upload.middleware')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const uploadBarbershopLogoController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const barbershop = await prisma.barbershop.findUnique({ where: { id: req.params.shopId } })
    if (!barbershop) return res.status(404).json({ message: 'Barbería no encontrada' })
    if (barbershop.ownerId !== req.user.id) return res.status(403).json({ message: 'Sin permiso' })

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, { folder: 'barbershop-logos' })
    await prisma.barbershop.update({ where: { id: req.params.shopId }, data: { logo: url } })
    res.status(200).json({ url, publicId })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const PHOTO_LIMITS = { BASIC: 5, STANDARD: 20, PREMIUM: Infinity }

const uploadBarbershopPhotoController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const barbershop = await prisma.barbershop.findUnique({ where: { id: req.params.shopId } })
    if (!barbershop) return res.status(404).json({ message: 'Barbería no encontrada' })
    if (barbershop.ownerId !== req.user.id) return res.status(403).json({ message: 'Sin permiso' })

    const limit = PHOTO_LIMITS[barbershop.plan] ?? 5
    if (limit !== Infinity) {
      const photoCount = await prisma.shopPhoto.count({ where: { barbershopId: req.params.shopId } })
      if (photoCount >= limit) {
        return res.status(403).json({ message: `Tu plan ${barbershop.plan} permite máximo ${limit} fotos en galería. Actualiza tu plan para subir más.` })
      }
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, { folder: 'barbershop-photos' })
    const photo = await prisma.shopPhoto.create({
      data: { barbershopId: req.params.shopId, url, caption: req.body.caption }
    })
    res.status(201).json({ url, publicId, photo })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteBarbershopPhotoController = async (req, res) => {
  try {
    const photo = await prisma.shopPhoto.findUnique({
      where: { id: req.params.photoId },
      include: { barbershop: true }
    })
    if (!photo) return res.status(404).json({ message: 'Foto no encontrada' })
    if (photo.barbershop.ownerId !== req.user.id) return res.status(403).json({ message: 'Sin permiso' })

    const publicId = extractPublicId(photo.url)
    if (publicId) await cloudinary.uploader.destroy(publicId)
    await prisma.shopPhoto.delete({ where: { id: req.params.photoId } })
    res.status(200).json({ message: 'Foto eliminada' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const uploadBarberAvatarController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const barber = await prisma.barber.findUnique({
      where: { id: req.params.barberId },
      include: { barbershop: true }
    })
    if (!barber) return res.status(404).json({ message: 'Barbero no encontrado' })

    const isOwner = barber.barbershop.ownerId === req.user.id
    const isBarber = barber.userId === req.user.id
    if (!isOwner && !isBarber) return res.status(403).json({ message: 'Sin permiso' })

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, { folder: 'barber-avatars' })
    await prisma.user.update({ where: { id: barber.userId }, data: { avatar: url } })
    res.status(200).json({ url, publicId })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const uploadServiceImageController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const service = await prisma.service.findUnique({
      where: { id: req.params.serviceId },
      include: { barbershop: true }
    })
    if (!service) return res.status(404).json({ message: 'Servicio no encontrado' })
    if (service.barbershop.ownerId !== req.user.id) return res.status(403).json({ message: 'Sin permiso' })

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, { folder: 'service-images' })
    await prisma.service.update({ where: { id: req.params.serviceId }, data: { image: url } })
    res.status(200).json({ url, publicId })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const uploadAdMediaController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })
    const ad = await prisma.advertisement.findUnique({
      where: { id: req.params.adId },
      include: { barbershop: true }
    })
    if (!ad) return res.status(404).json({ message: 'Anuncio no encontrado' })
    if (ad.barbershop.ownerId !== req.user.id) return res.status(403).json({ message: 'Sin permiso' })

    const isVideo = req.file.mimetype?.startsWith('video/')
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, {
      folder: 'ads-media',
      resource_type: isVideo ? 'video' : 'image'
    })
    await prisma.advertisement.update({
      where: { id: req.params.adId },
      data: { mediaUrl: url, mediaType: isVideo ? 'video' : 'image' }
    })
    res.status(200).json({ url, publicId, mediaType: isVideo ? 'video' : 'image' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  uploadBarbershopLogoController,
  uploadBarbershopPhotoController,
  deleteBarbershopPhotoController,
  uploadBarberAvatarController,
  uploadServiceImageController,
  uploadAdMediaController
}
