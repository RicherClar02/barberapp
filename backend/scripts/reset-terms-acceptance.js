// Fuerza a todos los usuarios a volver a aceptar los términos.
//
// Se ejecuta DESPUÉS de publicar una versión nueva de los documentos legales
// (editar los .md en docs/legal y subir TERMS_VERSION / PRIVACY_VERSION en
// src/constants/legal.js):
//
//   node scripts/reset-terms-acceptance.js
//
// Solo pone User.currentTermsAccepted = false. El histórico de
// TermsAcceptance NO se toca: es la prueba del consentimiento que exige la
// Ley 1581 de 2012 y debe conservarse 5 años.
//
// Recuerda que los términos se deben notificar con 30 días de anticipación
// (numeral 16 de los Términos): este script se corre el día en que la nueva
// versión entra en vigor, no el día en que se anuncia.

require('dotenv').config()
const prisma = require('../src/lib/prisma')
const { TERMS_VERSION, PRIVACY_VERSION } = require('../src/constants/legal')

const run = async () => {
  console.log(`Versiones vigentes: términos ${TERMS_VERSION}, privacidad ${PRIVACY_VERSION}`)

  // Ya al día con las versiones vigentes: no hay que molestarlos.
  const upToDate = await prisma.termsAcceptance.findMany({
    where: { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION },
    select: { userId: true },
    distinct: ['userId'],
  })
  const upToDateIds = upToDate.map(a => a.userId)

  const result = await prisma.user.updateMany({
    where: {
      currentTermsAccepted: true,
      deletedAt: null,
      id: { notIn: upToDateIds },
    },
    data: { currentTermsAccepted: false },
  })

  console.log(`✓ ${result.count} usuario(s) deberán volver a aceptar los términos.`)
  console.log(`  ${upToDateIds.length} ya habían aceptado esta versión y no se tocaron.`)

  await prisma.$disconnect()
}

run().catch(async (err) => {
  console.error('✗ Error:', err.message)
  await prisma.$disconnect()
  process.exit(1)
})
