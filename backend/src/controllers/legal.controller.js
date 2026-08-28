const legalService = require('../services/legal.service')
const { safeMessage } = require('../utils/safeError')

const acceptTermsController = async (req, res) => {
  try {
    const { termsVersion, privacyVersion } = req.body

    if (!termsVersion || !privacyVersion) {
      return res.status(400).json({ message: 'termsVersion y privacyVersion son obligatorios' })
    }

    const acceptance = await legalService.acceptTerms(
      req.user.id,
      { termsVersion, privacyVersion },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    )

    res.status(201).json({
      message: 'Aceptación registrada',
      acceptance: {
        id: acceptance.id,
        termsVersion: acceptance.termsVersion,
        privacyVersion: acceptance.privacyVersion,
        acceptedAt: acceptance.acceptedAt,
      },
    })
  } catch (error) {
    res.status(error.status || 400).json({ message: safeMessage(error) })
  }
}

const currentVersionsController = (req, res) => {
  res.status(200).json(legalService.getCurrentVersions())
}

const getDocumentController = async (req, res) => {
  try {
    const lang = req.query.lang === 'en' ? 'en' : 'es'
    const document = await legalService.getDocument(req.params.slug, lang)
    res.status(200).json(document)
  } catch (error) {
    res.status(error.status || 404).json({ message: safeMessage(error) })
  }
}

const acceptanceStatusController = async (req, res) => {
  try {
    const status = await legalService.getAcceptanceStatus(req.user.id)
    res.status(200).json(status)
  } catch (error) {
    res.status(error.status || 400).json({ message: safeMessage(error) })
  }
}

module.exports = {
  acceptTermsController,
  currentVersionsController,
  getDocumentController,
  acceptanceStatusController,
}
