import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'

export default function Login({ navigation }) {
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!email) e.email = 'Email requerido'
    if (!password) e.password = 'Contraseña requerida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      if (data.pendingApproval) {
        // Store minimal user info so PendingApproval screen can show name/role
        await login(data.user, null)
        return
      }
      await login(data.user, data.token)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Image
          source={require('../../../assets/Estilo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Header */}
        <Text style={styles.title}>Bienvenido de nuevo</Text>
        <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Password */}
          <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputWrapperFocused, { marginTop: spacing.md }]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>{loading ? 'Iniciando...' : 'Iniciar sesión'}</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o continúa con</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <Text style={styles.socialLogo}>G</Text>
            <Text style={styles.socialText}>Continuar con Google</Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
          <Text style={styles.registerText}>
            ¿No tienes cuenta? <Text style={styles.registerBold}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.xl, paddingTop: spacing.xxl + spacing.lg },
  logo: { width: 200, height: 110, alignSelf: 'center', marginBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, marginBottom: spacing.xl, textAlign: 'center' },
  form: { marginBottom: spacing.xl },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(74, 44, 10, 0.1)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputIcon: { fontSize: 16, marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  eyeBtn: { padding: spacing.xs },
  eyeIcon: { fontSize: 16 },
  errorText: { fontSize: fontSize.xs, color: colors.destructive, marginTop: 4 },
  forgotBtn: { alignSelf: 'center', marginTop: spacing.md },
  forgotText: { fontSize: fontSize.sm, color: colors.muted },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  submitBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.graySoft },
  dividerText: { fontSize: fontSize.xs, color: colors.muted, marginHorizontal: spacing.md },
  socialRow: { marginBottom: spacing.sm },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.graySoft,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  socialLogo: { fontSize: 18, fontWeight: '700', color: '#EA4335' },
  socialText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  registerLink: { alignItems: 'center', marginTop: spacing.xl },
  registerText: { fontSize: fontSize.sm, color: colors.muted },
  registerBold: { color: colors.accent, fontWeight: '700', textDecorationLine: 'underline' },
})
