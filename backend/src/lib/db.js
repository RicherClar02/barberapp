const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

let prisma = null

function getPrismaClient() {
  if (!prisma) {
    try {
      const { PrismaClient } = require('@prisma/client')
      prisma = new PrismaClient()
      console.log('✓ Prisma Client initialized')
    } catch (error) {
      console.error('✗ Failed to initialize Prisma Client:', error.message)
      // Return a dummy client for now
      prisma = null
    }
  }
  return prisma
}

module.exports = {
  getPrismaClient
}
