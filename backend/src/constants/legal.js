// Versiones vigentes de los documentos legales y su ubicación en /docs/legal.
//
// Al publicar una versión nueva de términos o privacidad:
//   1. Editar el .md correspondiente en docs/legal (y su traducción en /en).
//   2. Subir el número aquí.
//   3. Ejecutar `node scripts/reset-terms-acceptance.js` para poner
//      User.currentTermsAccepted = false y forzar la re-aceptación.
// El histórico de TermsAcceptance nunca se borra: es la prueba del
// consentimiento que exige la Ley 1581 de 2012.

const TERMS_VERSION = '1.0'
const PRIVACY_VERSION = '1.0'
const COOKIES_VERSION = '1.0'
const DELETION_POLICY_VERSION = '1.0'

// URL pública del panel web donde cualquiera puede leer los documentos sin
// tener cuenta (requisito de Google Play y App Store).
const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL || 'https://appestilo.co'

// slug → archivo markdown. El slug es lo que viaja en la URL del endpoint
// GET /api/legal/documents/:slug, así que no debe cambiar entre versiones.
const DOCUMENTS = {
  terms: {
    version: TERMS_VERSION,
    title: 'Términos y Condiciones',
    titleEn: 'Terms and Conditions',
    file: 'terminos-y-condiciones.md',
    fileEn: 'en/terms-and-conditions.md',
    path: '/terminos',
  },
  privacy: {
    version: PRIVACY_VERSION,
    title: 'Política de Privacidad',
    titleEn: 'Privacy Policy',
    file: 'politica-de-privacidad.md',
    fileEn: 'en/privacy-policy.md',
    path: '/privacidad',
  },
  cookies: {
    version: COOKIES_VERSION,
    title: 'Política de Cookies',
    titleEn: 'Cookie Policy',
    file: 'politica-de-cookies.md',
    fileEn: 'en/cookie-policy.md',
    path: '/cookies',
  },
  'account-deletion': {
    version: DELETION_POLICY_VERSION,
    title: 'Política de Eliminación de Cuenta',
    titleEn: 'Account Deletion Policy',
    file: 'politica-eliminacion-cuenta.md',
    fileEn: 'en/account-deletion-policy.md',
    path: '/eliminar-cuenta',
  },
}

// Datos del responsable, para el pie de las páginas públicas y los correos.
const COMPANY = {
  name: 'RC Studio',
  legalRepresentative: 'Brayan Richer Claros Díaz',
  idNumber: '1.123.802.892',
  address: 'Calle 19 # 37K 03, Marsella, Villavicencio, Meta, Colombia',
  phone: '+57 317 450 6405',
  email: 'richerclarosdiaz@gmail.com',
  country: 'Colombia',
}

module.exports = {
  TERMS_VERSION,
  PRIVACY_VERSION,
  COOKIES_VERSION,
  DELETION_POLICY_VERSION,
  PUBLIC_WEB_URL,
  DOCUMENTS,
  COMPANY,
}
