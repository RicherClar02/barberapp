const userService = require('../services/user.service')
const { safeMessage } = require('../utils/safeError')

// Se descarga como archivo: la app móvil y el navegador lo guardan
// directamente en vez de mostrar un JSON gigante en pantalla.
const dataExportController = async (req, res) => {
  try {
    const data = await userService.exportUserData(req.user.id)
    const stamp = new Date().toISOString().slice(0, 10)

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="estilo-mis-datos-${stamp}.json"`)
    res.status(200).send(JSON.stringify(data, null, 2))
  } catch (error) {
    res.status(error.status || 500).json({ message: safeMessage(error) })
  }
}

const deleteAccountController = async (req, res) => {
  try {
    const { password, confirmation } = req.body

    // Doble confirmación: la palabra evita el borrado por un toque accidental,
    // la contraseña evita que alguien lo haga con el teléfono desbloqueado.
    if (confirmation !== 'ELIMINAR') {
      return res.status(400).json({
        message: 'Debes escribir ELIMINAR para confirmar la eliminación de tu cuenta',
      })
    }

    const result = await userService.deleteOwnAccount(req.user.id, password)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.status || 400).json({ message: safeMessage(error) })
  }
}

// Público: para quien ya desinstaló la app y no puede iniciar sesión.
const requestDeletionController = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'El correo es obligatorio' })

    const result = await userService.requestAccountDeletion(email)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.status || 500).json({ message: safeMessage(error) })
  }
}

const confirmDeletionController = async (req, res) => {
  try {
    const token = req.body.token || req.query.token
    if (!token) return res.status(400).json({ message: 'Token de confirmación requerido' })

    const result = await userService.confirmAccountDeletion(token)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.status || 400).json({ message: safeMessage(error) })
  }
}

module.exports = {
  dataExportController,
  deleteAccountController,
  requestDeletionController,
  confirmDeletionController,
}
