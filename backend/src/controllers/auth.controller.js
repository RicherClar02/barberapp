const authService = require('../services/auth.service')
const { logHoneypot } = require('../utils/securityLog')

const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, role, department, city, website } = req.body

    // HONEYPOT: el campo "website" está oculto en el formulario.
    // Los humanos no lo ven; si viene con valor es un bot →
    // responder con un 201 falso sin crear nada (no avisar al bot).
    if (website) {
      logHoneypot(req.ip, email)
      return res.status(201).json({ message: 'Usuario registrado exitosamente' })
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' })
    }

    const result = await authService.register(
      { name, email, password, phone, role, department, city },
      req.ip,
      req.headers['user-agent']
    )

    if (result.pendingApproval) {
      return res.status(201).json(result)
    }

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

    const result = await authService.login({ email, password }, req.ip)

    if (result.pendingApproval) {
      return res.status(200).json(result)
    }

    res.status(200).json({ message: 'Login exitoso', ...result })
  } catch (error) {
    res.status(error.status || 401).json({ message: error.message })
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

const updateProfileController = async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body)
    res.status(200).json({ message: 'Perfil actualizado', user })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email es obligatorio' })

    const result = await authService.forgotPassword(email)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const verifyResetCodeController = async (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) return res.status(400).json({ message: 'Email y código son obligatorios' })

    const result = await authService.verifyResetCode(email, code)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const resetPasswordController = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, código y nueva contraseña son obligatorios' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const result = await authService.resetPassword(email, code, newPassword)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = {
  registerController,
  loginController,
  profileController,
  updateProfileController,
  forgotPasswordController,
  verifyResetCodeController,
  resetPasswordController,
}
