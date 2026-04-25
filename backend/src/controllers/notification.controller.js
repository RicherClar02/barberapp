const notificationService = require('../services/notification.service')

const savePreferencesController = async (req, res) => {
  try {
    const preferences = await notificationService.savePreferences(req.user.id, req.body)
    res.status(200).json({ message: 'Preferencias guardadas', preferences })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getPreferencesController = async (req, res) => {
  try {
    const preferences = await notificationService.getPreferences(req.user.id)
    res.status(200).json({ preferences })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getMyNotificationsController = async (req, res) => {
  try {
    const notifications = await notificationService.getMyNotifications(req.user.id)
    res.status(200).json({ notifications })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const markAsReadController = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id)
    res.status(200).json({ message: 'Notificación marcada como leída', notification })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const markAllAsReadController = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  savePreferencesController,
  getPreferencesController,
  getMyNotificationsController,
  markAsReadController,
  markAllAsReadController
}
