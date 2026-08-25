const { processMessage, getHistory } = require('../services/chatbot.service')

const sendMessage = async (req, res) => {
  try {
    const { barbershopId, text } = req.body
    const userId = req.user.id

    if (!barbershopId || !text?.trim()) {
      return res.status(400).json({ message: 'barbershopId y text son requeridos' })
    }

    const result = await processMessage(userId, barbershopId, text.trim())
    res.json(result)
  } catch (err) {
    console.error('Chatbot error:', err)
    res.status(500).json({ message: 'Error al procesar mensaje' })
  }
}

const getConversationHistory = async (req, res) => {
  try {
    const { barbershopId } = req.params
    const userId = req.user.id
    const limit = parseInt(req.query.limit) || 50

    const messages = await getHistory(userId, barbershopId, limit)
    res.json({ messages })
  } catch (err) {
    console.error('History error:', err)
    res.status(500).json({ message: 'Error al obtener historial' })
  }
}

module.exports = { sendMessage, getConversationHistory }
