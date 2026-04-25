const multer = require('multer')
const cloudinary = require('../config/cloudinary')

const MB = 1024 * 1024

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) return cb(null, true)
  cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'))
}

const mediaFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo']
  if (allowed.includes(file.mimetype)) return cb(null, true)
  cb(new Error('Formato de archivo no permitido'))
}

const memStorage = multer.memoryStorage()

const uploadLogo = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 5 * MB } })
const uploadPhoto = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 5 * MB } })
const uploadAvatar = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 5 * MB } })
const uploadServiceImg = multer({ storage: memStorage, fileFilter: imageFilter, limits: { fileSize: 5 * MB } })
const uploadAdMedia = multer({ storage: memStorage, fileFilter: mediaFilter, limits: { fileSize: 50 * MB } })

// Sube el buffer de req.file a Cloudinary y devuelve { url, publicId }
const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error)
      resolve({ url: result.secure_url, publicId: result.public_id })
    })
    stream.end(buffer)
  })

// Extrae el publicId de una URL de Cloudinary
const extractPublicId = (url) => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/)
  return match ? match[1] : null
}

module.exports = { uploadLogo, uploadPhoto, uploadAvatar, uploadServiceImg, uploadAdMedia, uploadToCloudinary, extractPublicId }
