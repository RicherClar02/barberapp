import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, StatusBar, TouchableOpacity, Image } from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'

export default function Welcome({ navigation }) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(40)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/Estilo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Tu barbería perfecta, a un toque</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalText}>
          Al continuar aceptas nuestros Términos y Condiciones y Política de Privacidad
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'flex-end',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 260,
    height: 150,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  tagline: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  loginBtn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  registerBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  legalText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 16,
  },
})
