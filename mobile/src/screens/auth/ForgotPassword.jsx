import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import api from '../../api/axios'

const STEPS = ['email', 'code', 'password']

export default function ForgotPassword({ navigation }) {
  const [step, setStep] = useState(0) // 0=email, 1=code, 2=password
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSendCode = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Ingresa tu correo electrónico')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() })
      setStep(1)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo enviar el código')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (code.length !== 6) return Alert.alert('Error', 'El código debe tener 6 dígitos')
    setLoading(true)
    try {
      await api.post('/api/auth/verify-reset-code', { email: email.trim().toLowerCase(), code })
      setStep(2)
    } catch (err) {
      Alert.alert('Código inválido', err.response?.data?.message || 'Código incorrecto o expirado')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 6) return Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres')
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Las contraseñas no coinciden')
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code,
        newPassword,
      })
      Alert.alert('¡Listo!', 'Tu contraseña ha sido actualizada', [
        { text: 'Iniciar sesión', onPress: () => navigation.replace('Login') }
      ])
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo actualizar la contraseña')
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
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        {/* Logo */}
        <Image
          source={require('../../../assets/Estilo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Step indicator */}
        <View style={styles.stepsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.stepDot, i <= step && styles.stepDotActive, i < step && styles.stepDotDone]}
            />
          ))}
        </View>

        {/* STEP 0 — Email */}
        {step === 0 && (
          <>
            <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.subtitle}>Ingresa tu correo y te enviaremos un código de 6 dígitos</Text>
            <View style={styles.form}>
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
              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>{loading ? 'Enviando...' : 'Enviar código'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STEP 1 — OTP Code */}
        {step === 1 && (
          <>
            <Text style={styles.title}>Verificar código</Text>
            <Text style={styles.subtitle}>Ingresa el código de 6 dígitos enviado a{'\n'}{email}</Text>
            <View style={styles.form}>
              <View style={[styles.inputWrapper, styles.codeWrapper, focusedField === 'code' && styles.inputWrapperFocused]}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor={colors.muted}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  onFocus={() => setFocusedField('code')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleVerifyCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>{loading ? 'Verificando...' : 'Verificar código'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendBtn} onPress={handleSendCode} disabled={loading}>
                <Text style={styles.resendText}>¿No recibiste el código? <Text style={styles.resendLink}>Reenviar</Text></Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STEP 2 — New Password */}
        {step === 2 && (
          <>
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.subtitle}>Elige una contraseña segura para tu cuenta</Text>
            <View style={styles.form}>
              <View style={[styles.inputWrapper, focusedField === 'newPass' && styles.inputWrapperFocused]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nueva contraseña"
                  placeholderTextColor={colors.muted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('newPass')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputWrapper, { marginTop: spacing.md }, focusedField === 'confirm' && styles.inputWrapperFocused]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor={colors.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>{loading ? 'Actualizando...' : 'Cambiar contraseña'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  backBtnText: { color: colors.primary, fontSize: 28, fontWeight: '700', lineHeight: 32 },
  logo: { width: 200, height: 110, alignSelf: 'center', marginBottom: spacing.xl },
  stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.graySoft,
  },
  stepDotActive: { backgroundColor: colors.accent, width: 24 },
  stepDotDone: { backgroundColor: colors.primary, width: 10 },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, marginBottom: spacing.xl, textAlign: 'center', lineHeight: 22 },
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
  codeWrapper: { justifyContent: 'center' },
  inputIcon: { fontSize: 16, marginRight: spacing.sm },
  input: { flex: 1, fontSize: fontSize.sm, color: colors.primary },
  codeInput: { textAlign: 'center', fontSize: 28, fontWeight: '900', letterSpacing: 8, color: colors.primary },
  inputWrapperFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  eyeBtn: { padding: spacing.xs },
  eyeIcon: { fontSize: 16 },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  submitBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  resendBtn: { alignItems: 'center', marginTop: spacing.lg },
  resendText: { fontSize: fontSize.sm, color: colors.muted },
  resendLink: { color: colors.accent, fontWeight: '700' },
})
