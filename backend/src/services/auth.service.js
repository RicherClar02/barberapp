const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )
}

const register = async ({ name, email, password, phone, role }) => {
  // Verificar si el usuario ya existe
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new Error('El correo ya está registrado')
  }

  // Encriptar contraseña
  const hashedPassword = await bcrypt.hash(password, 10)

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || 'CLIENT'
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true
    }
  })

  const token = generateToken(user)
  return { user, token }
}

const login = async ({ email, password }) => {
  // Buscar usuario
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new Error('Credenciales incorrectas')
  }

  if (!user.isActive) {
    throw new Error('Cuenta desactivada')
  }

  // Verificar contraseña
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw new Error('Credenciales incorrectas')
  }

  const token = generateToken(user)

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar
    },
    token
  }
}

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      isVerified: true,
      createdAt: true
    }
  })

  if (!user) throw new Error('Usuario no encontrado')
  return user
}

module.exports = { register, login, getProfile }