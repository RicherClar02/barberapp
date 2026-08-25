const { DEPARTMENTS, getCitiesByDepartment } = require('../constants/colombia')

// Lista los 32 departamentos de Colombia
const getDepartmentsController = (req, res) => {
  res.status(200).json({ departments: DEPARTMENTS })
}

// Lista los principales municipios de un departamento
const getCitiesController = (req, res) => {
  const { department } = req.params
  const cities = getCitiesByDepartment(department)

  if (!cities) {
    return res.status(404).json({ message: 'Departamento no encontrado' })
  }

  res.status(200).json({ department, cities })
}

module.exports = { getDepartmentsController, getCitiesController }
