require('dotenv').config()
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Cargado' : '✗ No cargado')
console.log('NODE_ENV:', process.env.NODE_ENV)
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const authRoutes = require('./src/routes/auth.routes')
const barbershopRoutes = require('./src/routes/barbershop.routes')
const barberRoutes = require('./src/routes/barber.routes')
const serviceRoutes = require('./src/routes/service.routes')

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/barbershops', barbershopRoutes)
app.use('/api/barbers', barberRoutes)
app.use('/api/services', serviceRoutes)

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: '✂ BarberApp API funcionando' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})