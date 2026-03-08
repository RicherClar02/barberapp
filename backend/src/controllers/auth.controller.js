const authService = require('../services/auth.service')

const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' })
    }

    const result = await authService.register({ name, email, password, phone, role })
    res.status(201).json({ message: 'Usuario registrado exitosamente', ...result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' })
    }

    const result = await authService.login({ email, password })
    res.status(200).json({ message: 'Login exitoso', ...result })
  } catch (error) {
    res.status(401).json({ message: error.message })
  }
}

const profileController = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id)
    res.status(200).json({ user })
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
}

module.exports = { registerController, loginController, profileController }