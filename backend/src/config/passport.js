// TODO: configurar credenciales en Google Cloud Console
// TODO: configurar app en Facebook Developers
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const FacebookStrategy = require('passport-facebook').Strategy
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const pg = require('pg')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )

const handleOAuthUser = async (provider, providerId, email, name, avatar) => {
  const providerField = provider === 'google' ? 'googleId' : 'facebookId'

  // Buscar por providerId
  let user = await prisma.user.findFirst({ where: { [providerField]: providerId } })

  if (!user) {
    // Buscar por email para vincular
    user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { [providerField]: providerId }
      })
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email,
          [providerField]: providerId,
          isVerified: true,
          avatar
        }
      })
    }
  }

  return { user, token: generateToken(user) }
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) return done(new Error('No se pudo obtener el email de Google'))
          const result = await handleOAuthUser('google', profile.id, email, profile.displayName, profile.photos?.[0]?.value)
          return done(null, result)
        } catch (error) {
          return done(error)
        }
      }
    )
  )
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ['id', 'displayName', 'email', 'photos']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) return done(new Error('No se pudo obtener el email de Facebook'))
          const result = await handleOAuthUser('facebook', profile.id, email, profile.displayName, profile.photos?.[0]?.value)
          return done(null, result)
        } catch (error) {
          return done(error)
        }
      }
    )
  )
}

module.exports = passport
