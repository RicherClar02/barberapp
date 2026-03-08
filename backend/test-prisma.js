#!/usr/bin/env node
require('dotenv').config()

console.log('DATABASE_URL:', process.env.DATABASE_URL)

try {
  const { PrismaClient } = require('@prisma/client')
  console.log('PrismaClient imported successfully')
  
  const prisma = new PrismaClient()
  console.log('✓ PrismaClient instantiated successfully')
  
  prisma.$disconnect()
} catch (error) {
  console.error('✗ Error:', error.message)
  console.error('Stack:', error.stack)
}
