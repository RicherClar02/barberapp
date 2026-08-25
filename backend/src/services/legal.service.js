const fs = require('fs/promises')
const path = require('path')
const prisma = require('../lib/prisma')
const {
  TERMS_VERSION, PRIVACY_VERSION, PUBLIC_WEB_URL, DOCUMENTS,
} = require('../constants/legal')

// Los .md viven en /docs/legal, fuera de backend/. Una sola fuente de verdad:
// la app móvil y el panel web piden el texto a este endpoint en vez de
// mantener copias que se desincronizan.
const LEGAL_DIR = path.resolve(__dirname, '../../../docs/legal')

// Cache en memoria: los documentos solo cambian al desplegar.
const cache = new Map()

// Registra la aceptación y marca al usuario como al día con la versión vigente.
// Nunca se actualiza una fila existente: cada aceptación es un registro nuevo,
// de modo que queda el histórico completo de qué versión aceptó y cuándo.
const acceptTerms = async (userId, { termsVersion, privacyVersion }, { ip, userAgent }) => {
  if (termsVersion !== TERMS_VERSION || privacyVersion !== PRIVACY_VERSION) {
    const error = new Error(
      `Versiones desactualizadas. Vigentes: términos ${TERMS_VERSION}, privacidad ${PRIVACY_VERSION}`
    )
    error.status = 409
    throw error
  }

  const [acceptance] = await prisma.$transaction([
    prisma.termsAcceptance.create({
      data: {
        userId,
        termsVersion,
        privacyVersion,
        ipAddress: ip || 'unknown',
        // El User-Agent puede ser larguísimo en algunos navegadores; 500
        // caracteres bastan para identificar el dispositivo.
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { currentTermsAccepted: true },
    }),
  ])

  return acceptance
}

const getCurrentVersions = () => ({
  terms: {
    version: TERMS_VERSION,
    title: DOCUMENTS.terms.title,
    url: `${PUBLIC_WEB_URL}${DOCUMENTS.terms.path}`,
    apiUrl: '/api/legal/documents/terms',
  },
  privacy: {
    version: PRIVACY_VERSION,
    title: DOCUMENTS.privacy.title,
    url: `${PUBLIC_WEB_URL}${DOCUMENTS.privacy.path}`,
    apiUrl: '/api/legal/documents/privacy',
  },
  cookies: {
    version: DOCUMENTS.cookies.version,
    title: DOCUMENTS.cookies.title,
    url: `${PUBLIC_WEB_URL}${DOCUMENTS.cookies.path}`,
    apiUrl: '/api/legal/documents/cookies',
  },
  accountDeletion: {
    version: DOCUMENTS['account-deletion'].version,
    title: DOCUMENTS['account-deletion'].title,
    url: `${PUBLIC_WEB_URL}${DOCUMENTS['account-deletion'].path}`,
    apiUrl: '/api/legal/documents/account-deletion',
  },
})

// Devuelve el markdown crudo de un documento. `lang` acepta 'es' (por
// defecto) o 'en'; si falta la traducción se responde con la versión en
// español antes que con un 404.
const getDocument = async (slug, lang = 'es') => {
  const doc = DOCUMENTS[slug]
  if (!doc) {
    const error = new Error('Documento legal no encontrado')
    error.status = 404
    throw error
  }

  const cacheKey = `${slug}:${lang}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const relative = lang === 'en' ? doc.fileEn : doc.file
  let content
  try {
    content = await fs.readFile(path.join(LEGAL_DIR, relative), 'utf8')
  } catch {
    if (lang === 'en') return getDocument(slug, 'es')
    const error = new Error('Documento legal no disponible')
    error.status = 404
    throw error
  }

  const result = {
    slug,
    lang,
    version: doc.version,
    title: lang === 'en' ? doc.titleEn : doc.title,
    url: `${PUBLIC_WEB_URL}${doc.path}`,
    content,
  }
  cache.set(cacheKey, result)
  return result
}

// Estado de aceptación del usuario: lo consulta la app al arrancar para
// mostrar el aviso de re-aceptación cuando se publica una versión nueva.
const getAcceptanceStatus = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentTermsAccepted: true,
      termsAcceptances: {
        orderBy: { acceptedAt: 'desc' },
        take: 1,
        select: { termsVersion: true, privacyVersion: true, acceptedAt: true },
      },
    },
  })

  if (!user) {
    const error = new Error('Usuario no encontrado')
    error.status = 404
    throw error
  }

  const last = user.termsAcceptances[0] || null
  const upToDate =
    user.currentTermsAccepted &&
    last?.termsVersion === TERMS_VERSION &&
    last?.privacyVersion === PRIVACY_VERSION

  return {
    accepted: Boolean(upToDate),
    needsAcceptance: !upToDate,
    lastAcceptance: last,
    currentVersions: { terms: TERMS_VERSION, privacy: PRIVACY_VERSION },
  }
}

module.exports = {
  acceptTerms,
  getCurrentVersions,
  getDocument,
  getAcceptanceStatus,
}
