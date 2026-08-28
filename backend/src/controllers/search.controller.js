const searchService = require('../services/search.service')
const { safeMessage } = require('../utils/safeError')

const searchController = async (req, res) => {
  try {
    const results = await searchService.globalSearch(req.query, req.user?.id)
    res.status(200).json(results)
  } catch (error) {
    res.status(400).json({ message: safeMessage(error) })
  }
}

module.exports = { searchController }
