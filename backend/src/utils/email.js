const validator = require('validator')

// Fuente única de la normalización de correos.
//
// Antes la regla vivía solo en los validadores de express-validator, que
// aplican .trim().normalizeEmail() antes del controller. El problema es que
// dependía de que cada ruta se acordara de enchufar su validador, y dos no lo
// hacían: POST /verify-reset-code no tenía ninguno (partía en dos el flujo de
// recuperación: el paso 1 normalizaba, el 2 no, y el código llegaba al correo
// pero se rechazaba como inválido) y GET /find-by-email tampoco.
//
// Al vivir en los servicios, la normalización se aplica venga la petición por
// donde venga: ruta con validador, ruta sin validador, u OAuth, que ni siquiera
// pasa por un body.
//
// Qué hace normalizeEmail() de validator con sus opciones por defecto —las
// mismas con las que se guardaron los usuarios ya existentes, por eso no se
// tocan—:
//   Juan.Perez+tienda@Gmail.com  -> juanperez@gmail.com   (minúsculas, sin puntos, sin +tag)
//   juan@googlemail.com          -> juan@gmail.com
//   juan+tag@hotmail.com         -> juan@hotmail.com      (sin +tag, pero conserva puntos)
//   Juan.Perez@empresa.com.co    -> juan.perez@empresa.com.co  (solo minúsculas)
//
// Dos comportamientos de la librería que obligan al orden de abajo:
//   1. No recorta espacios: 'JUAN@GMAIL.COM  ' -> 'juan@gmail.com  '. Hay que
//      hacer trim ANTES.
//   2. No falla con basura: 'basura' -> '@basura'. Sin la guarda de isEmail, una
//      entrada inválida se convertiría en un string distinto del original y se
//      buscaría eso en la base.
// Es idempotente: normalizar dos veces da lo mismo, así que no molesta que los
// validadores sigan normalizando antes.
const normalizeEmail = (email) => {
  const trimmed = String(email ?? '').trim()
  if (!validator.isEmail(trimmed)) return trimmed
  return validator.normalizeEmail(trimmed) || trimmed
}

module.exports = { normalizeEmail }
