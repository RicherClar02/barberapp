const { body, validationResult } = require('express-validator')
const { PASSWORD_MIN, PASSWORD_MAX, PASSWORD_LENGTH_MESSAGE } = require('../constants/password')

// Validación y sanitización de inputs con express-validator.
// Reglas generales: trim + escape en strings libres (anti-XSS),
// longitudes máximas (nombres 100, comentarios 500, descripciones 1000).

// Corre las validaciones y corta con 400 si hay errores
const runValidations = (validations) => async (req, res, next) => {
  for (const validation of validations) {
    await validation.run(req)
  }
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: errors.array().map(e => ({ field: e.path, error: e.msg })),
    })
  }
  next()
}

// Teléfono colombiano: 10 dígitos empezando por 3 (celular) o con +57
const colombianPhone = (value) => {
  const clean = String(value).replace(/[\s\-()]/g, '').replace(/^\+57/, '')
  if (!/^3\d{9}$/.test(clean) && !/^60\d{8}$/.test(clean)) {
    throw new Error('Teléfono colombiano inválido (ej: 3001234567)')
  }
  return true
}

const validateRegister = runValidations([
  body('name').trim().notEmpty().withMessage('Nombre requerido')
    .isLength({ max: 100 }).withMessage('Nombre máximo 100 caracteres').escape(),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: PASSWORD_MIN, max: PASSWORD_MAX }).withMessage(PASSWORD_LENGTH_MESSAGE),
  body('phone').optional({ values: 'falsy' }).custom(colombianPhone),
  body('role').optional().isIn(['CLIENT', 'BARBER', 'OWNER']).withMessage('Rol inválido'),
  body('department').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).escape(),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).escape(),
])

const validateLogin = runValidations([
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('Contraseña requerida').isLength({ max: 128 }),
])

const validateForgotPassword = runValidations([
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
])

const validateResetPassword = runValidations([
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Código de 6 dígitos').isNumeric(),
  body('newPassword').isLength({ min: PASSWORD_MIN, max: PASSWORD_MAX }).withMessage(PASSWORD_LENGTH_MESSAGE),
])

// Solo presencia. La política de longitud la aplica auth.service.changePassword
// para poder responder con un `message` propio ("la nueva no cumple los
// requisitos") en vez del genérico "Datos inválidos" de runValidations: el
// panel muestra ese campo tal cual y el usuario necesita saber cuál de las dos
// contraseñas está mal.
const validateChangePassword = runValidations([
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword').notEmpty().withMessage('Nueva contraseña requerida'),
])

const validateUpdateProfile = runValidations([
  body('name').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).escape(),
  body('phone').optional({ values: 'falsy' }).custom(colombianPhone),
  body('whatsappNumber').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  body('department').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).escape(),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).escape(),
])

const validateCreateReview = runValidations([
  body('appointmentId').trim().notEmpty().withMessage('appointmentId requerido').isUUID().withMessage('appointmentId inválido'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating entre 1 y 5'),
  body('comment').optional({ values: 'falsy' }).trim()
    .isLength({ max: 500 }).withMessage('Comentario máximo 500 caracteres').escape(),
])

const validateCreateAppointment = runValidations([
  body('barbershopId').trim().notEmpty().isUUID().withMessage('barbershopId inválido'),
  body('barberId').trim().notEmpty().isUUID().withMessage('barberId inválido'),
  body('serviceId').trim().notEmpty().isUUID().withMessage('serviceId inválido'),
  body('date').trim().isISO8601().withMessage('Fecha inválida (YYYY-MM-DD)'),
  body('startTime').trim().matches(/^\d{2}:\d{2}$/).withMessage('Hora inválida (HH:MM)'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).escape(),
])

const validateChatMessage = runValidations([
  body('barbershopId').trim().notEmpty().isUUID().withMessage('barbershopId inválido'),
  body('text').trim().notEmpty().withMessage('Mensaje vacío')
    .isLength({ max: 1000 }).withMessage('Mensaje máximo 1000 caracteres'),
])

const validateBarbershop = runValidations([
  body('name').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Nombre máximo 100 caracteres').escape(),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Descripción máximo 1000 caracteres').escape(),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 200 }).escape(),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).escape(),
  body('department').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).escape(),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email inválido'),
])

module.exports = {
  runValidations,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateCreateReview,
  validateCreateAppointment,
  validateChatMessage,
  validateBarbershop,
}
