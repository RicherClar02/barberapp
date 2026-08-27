// Política de contraseñas. Es la MISMA para registro, reset por OTP y cambio
// desde el perfil: si un camino admite una contraseña que otro rechaza, el
// usuario queda con credenciales que no puede reproducir.
//
// El máximo no es cosmético: bcrypt ignora todo lo que pase de 72 bytes, así
// que aceptar cadenas arbitrariamente largas da una falsa sensación de fuerza.
const PASSWORD_MIN = 6
const PASSWORD_MAX = 128

const PASSWORD_LENGTH_MESSAGE = `Contraseña entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`

module.exports = { PASSWORD_MIN, PASSWORD_MAX, PASSWORD_LENGTH_MESSAGE }
