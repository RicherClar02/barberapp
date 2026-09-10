const prisma = require('../lib/prisma')
const { safeMessage } = require('../utils/safeError')
// Sin estos tres imports, TODOS los endpoints de subida lanzaban un
// ReferenceError en cuanto pasaban los chequeos de permiso: el try/catch lo
// tragaba y devolvía un 500 genérico, así que desde afuera parecía un fallo
// de Cloudinary y no un archivo al que le faltaban los require.
const cloudinary = require('../config/cloudinary')
const { uploadToCloudinary, extractPublicId } = require('../middleware/upload.middleware')

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
    res.status(500).json({ message: safeMessage(error) })
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
    res.status(500).json({ message: safeMessage(error) })
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
    res.status(500).json({ message: safeMessage(error) })
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
    res.status(500).json({ message: safeMessage(error) })
  }
}

// Avatar de cualquier usuario autenticado sobre SU propia cuenta. Es la vía
// que usan el cliente y el dueño, que no tienen fila en Barber y por eso no
// pueden pasar por barber-avatar. Un barbero puede usar cualquiera de las dos:
// las dos terminan escribiendo user.avatar.
const uploadUserAvatarController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ningún archivo' })

    // Solo su propia cuenta. ADMIN pasa, igual que en ownership.middleware.
    const esPropia = req.params.userId === req.user.id
    if (!esPropia && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Sin permiso' })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, avatar: true, deletedAt: true },
    })
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    // Una cuenta anonimizada no vuelve a tener foto: la fila se conserva solo
    // porque las citas y los pagos la referencian.
    if (user.deletedAt) return res.status(410).json({ message: 'Esta cuenta fue eliminada' })

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, { folder: 'user-avatars' })
    await prisma.user.update({ where: { id: user.id }, data: { avatar: url } })

    // El avatar anterior se borra DESPUÉS de que el nuevo quedó guardado: si se
    // borrara antes y la subida fallara, el usuario se quedaría sin ninguno.
    // Que el borrado falle no invalida la subida, así que no tumba la respuesta.
    const anterior = user.avatar && extractPublicId(user.avatar)
    if (anterior) {
      try {
        await cloudinary.uploader.destroy(anterior)
      } catch (error) {
        console.error(`[upload] no se pudo borrar el avatar anterior (userId=${user.id}):`, error.message)
      }
    }

    res.status(200).json({ url, publicId })
  } catch (error) {
    res.status(500).json({ message: safeMessage(error) })
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
    res.status(500).json({ message: safeMessage(error) })
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
    res.status(500).json({ message: safeMessage(error) })
  }
}

module.exports = {
  uploadBarbershopLogoController,
  uploadBarbershopPhotoController,
  deleteBarbershopPhotoController,
  uploadBarberAvatarController,
  uploadUserAvatarController,
  uploadServiceImageController,
  uploadAdMediaController
}
