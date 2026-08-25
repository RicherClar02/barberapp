// Instancia ÚNICA y compartida de Prisma para toda la app.
//
// Antes cada servicio creaba su propio `new pg.Pool()` + `new PrismaClient()`.
// Con ~30 módulos y el pool por defecto (10 conexiones c/u) eso podía agotar
// las conexiones de PostgreSQL bajo carga. Centralizar aquí garantiza un solo
// pool de conexiones y un solo cliente reutilizado en todo el proceso.
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

module.exports = prisma
