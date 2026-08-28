// Los controladores hacen `res.json({ message: error.message })`. Para los
// errores de dominio que lanzan los servicios ("Barbería no encontrada", "No
// tienes permiso...") eso está bien: son mensajes escritos para el usuario.
//
// El problema son los errores de Prisma. Su .message trae el nombre de la
// tabla, la lista de columnas con sus tipos y un fragmento de la consulta, y
// eso terminaba impreso en el panel del dueño. Además de ilegible, le cuenta a
// cualquiera cómo está armada la base.
//
// safeMessage() deja pasar los mensajes de dominio y reemplaza los de Prisma
// por una frase en español. El detalle técnico va al log del servidor.

const PRISMA_MESSAGES = {
  P2002: 'Ya existe un registro con esos datos.',
  P2003: 'No se puede completar: el registro está vinculado a otros datos.',
  P2025: 'No se encontró el registro solicitado.',
}

const GENERIC = 'No se pudo completar la operación. Intenta de nuevo.'
const INCOMPLETE = 'Faltan datos obligatorios o alguno tiene un formato incorrecto.'

// Todos los errores de Prisma traen clientVersion. Los conocidos además traen
// un code tipo P2002; los de validación (campo requerido faltante, tipo que no
// corresponde) no traen code pero sí el nombre PrismaClientValidationError.
const isPrismaError = (error) =>
  !!error &&
  (error.clientVersion !== undefined ||
    /^P\d{4}$/.test(error.code || '') ||
    /^PrismaClient/.test(error.name || '') ||
    /^PrismaClient/.test(error.constructor?.name || ''))

const safeMessage = (error) => {
  if (!isPrismaError(error)) return error?.message || GENERIC

  // El log del servidor sí se queda con todo: sin esto, sanear el mensaje
  // dejaría el fallo invisible para quien tenga que diagnosticarlo.
  console.error('[prisma]', error.code || error.name, '-', error.message)

  if (error.code && PRISMA_MESSAGES[error.code]) return PRISMA_MESSAGES[error.code]
  if (/^PrismaClientValidationError$/.test(error.name || error.constructor?.name || '')) {
    return INCOMPLETE
  }
  return GENERIC
}

module.exports = { safeMessage, isPrismaError }
