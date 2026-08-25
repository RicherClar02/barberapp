const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const JWT_VERIFY_OPTIONS = {
  issuer: 'estilo-api',
  audience: 'estilo-clients',
}

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS)

    // tokenVersion: al cambiar la contraseña se incrementa en BD,
    // lo que invalida todos los tokens emitidos antes del cambio
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true, isActive: true },
    })
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Cuenta no disponible' })
    }
    if ((decoded.tv ?? 0) !== user.tokenVersion) {
      return res.status(401).json({ message: 'Sesión expirada. Vuelve a iniciar sesión.' })
    }

    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

// Igual que authMiddleware pero NO falla si no hay token o si es inválido:
// adjunta req.user solo cuando el token es válido Y la cuenta sigue activa
// con el tokenVersion vigente; en cualquier otro caso continúa como anónimo.
// Aplica la MISMA validación de BD que authMiddleware (isActive + tokenVersion)
// para no tratar como autenticado a un usuario desactivado o con token revocado.
const optionalAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET, JWT_VERIFY_OPTIONS)

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { tokenVersion: true, isActive: true },
      })

      // Solo se considera autenticado si la cuenta existe, está activa y el
      // tokenVersion del JWT coincide con el de la BD. Si no → anónimo.
      if (user && user.isActive && (decoded.tv ?? 0) === user.tokenVersion) {
        req.user = decoded
      }
    } catch {
      // Token inválido o expirado: continuar sin usuario (anónimo)
    }
  }

  next()
}

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permiso para esta acción' })
    }
    next()
  }
}

module.exports = { authMiddleware, optionalAuthMiddleware, requireRole }
