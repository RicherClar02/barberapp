import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import CitySelectorModal from '../../components/ui/CitySelectorModal'

const ROLES = [
  { key: 'CLIENT', label: 'Cliente', icon: '👤', desc: 'Quiero reservar citas' },
  { key: 'BARBER', label: 'Barbero', icon: '✂️', desc: 'Quiero ofrecer mis servicios' },
  { key: 'OWNER', label: 'Dueño de Barbería', icon: '🏢', desc: 'Administro mi barbería' },
]

export default function Register({ navigation }) {
  const { login } = useAuthStore()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', whatsapp: '', password: '', confirmPassword: '', role: 'CLIENT',
    department: null, city: null,
  })
  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const validate = () => {
    const e = {}
    if (!form.name) e.name = 'Nombre requerido'
    if (!form.email) e.email = 'Email requerido'
    if (!form.phone) e.phone = 'Teléfono requerido'
    if (!form.password || form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden'
    if (!termsAccepted) e.terms = 'Debes aceptar los términos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/register', {
        name: form.name, email: form.email, phone: form.phone,
        whatsapp: form.whatsapp, password: form.password, role: form.role,
        department: form.department, city: form.city,
      })
      if (form.whatsapp) {
        await api.put('/api/notifications/preferences', { whatsapp: form.whatsapp }).catch(() => {})
      }
      await login(data.user, data.token)

      // Registro explícito de la aceptación (Ley 1581 de 2012). El backend ya
      // deja una constancia al crear la cuenta; esta llamada añade la que
      // corresponde al acto de marcar la casilla en este dispositivo. Si falla
      // no se bloquea el registro: la cuenta ya existe y la constancia está.
      if (data.token) {
        try {
          const { data: versions } = await api.get('/api/legal/current-versions')
          await api.post('/api/legal/accept-terms', {
            termsVersion: versions.terms.version,
            privacyVersion: versions.privacy.version,
          })
        } catch {
          // No molestar al usuario: la constancia del registro ya quedó guardada.
        }
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType, secure, showToggle, onToggle, error }) => (
    <View style={{ marginBottom: spacing.md }}>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          secureTextEntry={secure}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        />
        {showToggle !== undefined && (
          <TouchableOpacity onPress={onToggle} style={{ padding: spacing.xs }}>
            <Text style={{ fontSize: 14 }}>{!secure ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )

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

        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Es gratis</Text>

        {/* Role selector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>¿Cómo usarás ESTILO?</Text>
          <Text style={styles.sectionSubtitle}>Puedes cambiarlo después</Text>
        </View>

        <View style={styles.roleGrid}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r.key}
              onPress={() => set('role', r.key)}
              style={[styles.roleCard, form.role === r.key && styles.roleCardActive]}
              activeOpacity={0.8}
            >
              {form.role === r.key && (
                <View style={styles.roleCheck}>
                  <Text style={styles.roleCheckText}>✓</Text>
                </View>
              )}
              <Text style={styles.roleIcon}>{r.icon}</Text>
              <Text style={[styles.roleLabel, form.role === r.key && styles.roleLabelActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(form.role === 'BARBER' || form.role === 'OWNER') && (
          <View style={styles.verifyNotice}>
            <Text style={styles.verifyNoticeText}>
              ⚠️ Si eres Barbero o Dueño, un administrador verificará tu cuenta
            </Text>
          </View>
        )}

        {/* Form fields */}
        <View style={{ marginTop: spacing.lg }}>
          <InputField
            label="Nombre completo"
            value={form.name}
            onChangeText={v => set('name', v)}
            placeholder="Juan García"
            error={errors.name}
          />
          <InputField
            label="Email"
            value={form.email}
            onChangeText={v => set('email', v)}
            placeholder="tu@email.com"
            keyboardType="email-address"
            error={errors.email}
          />

          {/* Phone with CO flag */}
          <View style={{ marginBottom: spacing.md }}>
            <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
              <View style={styles.flagBadge}>
                <Text style={styles.flagText}>🇨🇴 +57</Text>
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="300 000 0000"
                placeholderTextColor={colors.muted}
                value={form.phone}
                onChangeText={v => set('phone', v)}
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Departamento y ciudad de residencia */}
          <View style={{ marginBottom: spacing.md }}>
            <TouchableOpacity style={styles.inputWrapper} onPress={() => setCityModalOpen(true)}>
              <Text style={[styles.input, { color: form.city ? colors.primary : colors.muted, paddingVertical: 14 }]}>
                {form.city ? `📍 ${form.city}${form.department ? `, ${form.department}` : ''}` : '📍 Departamento y ciudad'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* WhatsApp with CO flag */}
          <View style={{ marginBottom: 4 }}>
            <View style={styles.inputWrapper}>
              <View style={styles.flagBadge}>
                <Text style={styles.flagText}>🇨🇴 +57</Text>
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="WhatsApp (opcional)"
                placeholderTextColor={colors.muted}
                value={form.whatsapp}
                onChangeText={v => set('whatsapp', v)}
                keyboardType="phone-pad"
              />
            </View>
            <Text style={styles.waNote}>Para recordatorios automáticos de tus citas</Text>
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Contraseña"
                placeholderTextColor={colors.muted}
                value={form.password}
                onChangeText={v => set('password', v)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: spacing.xs }}>
                <Text style={{ fontSize: 14 }}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={{ marginBottom: spacing.md }}>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.muted}
                value={form.confirmPassword}
                onChangeText={v => set('confirmPassword', v)}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ padding: spacing.xs }}>
                <Text style={{ fontSize: 14 }}>{showConfirm ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>
        </View>

        {/* Terms — obligatorio: sin aceptación no se crea la cuenta.
            Los enlaces abren las pantallas de lectura sin perder el formulario. */}
        <View style={styles.termsRow}>
          <TouchableOpacity
            onPress={() => setTermsAccepted(!termsAccepted)}
            hitSlop={8}
            style={[styles.checkbox, termsAccepted && styles.checkboxActive]}
          >
            {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.termsText}>
            He leído y acepto los{' '}
            <Text style={styles.termsLink} onPress={() => navigation.navigate('Terms')}>
              Términos y Condiciones
            </Text>
            {' '}y la{' '}
            <Text style={styles.termsLink} onPress={() => navigation.navigate('Privacy')}>
              Política de Privacidad
            </Text>
          </Text>
        </View>
        {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o continúa con</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={{ marginBottom: spacing.sm }}>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <Text style={[styles.socialLogo, { color: '#EA4335' }]}>G</Text>
            <Text style={styles.socialText}>Continuar con Google</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginBottom: spacing.xl }}>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <Text style={[styles.socialLogo, { color: '#1877F2' }]}>f</Text>
            <Text style={styles.socialText}>Continuar con Facebook</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
          <Text style={styles.loginText}>
            ¿Ya tienes cuenta? <Text style={styles.loginBold}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <CitySelectorModal
        visible={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        onSelect={({ department, city }) => setForm(f => ({ ...f, department, city }))}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  logo: { width: 190, height: 104, alignSelf: 'center', marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', marginBottom: spacing.xl },
  sectionHeader: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  sectionSubtitle: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  roleGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  roleCard: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.graySoft,
    backgroundColor: colors.white,
    alignItems: 'center',
    position: 'relative',
  },
  roleCardActive: { borderColor: colors.accent, backgroundColor: colors.accent + '10' },
  roleCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  roleCheckText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  roleIcon: { fontSize: 24, marginBottom: 4 },
  roleLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  roleLabelActive: { color: colors.primary },
  verifyNotice: {
    backgroundColor: '#FEF9C3',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  verifyNoticeText: { fontSize: fontSize.xs, color: '#854D0E' },
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
  inputWrapperError: { borderColor: colors.destructive },
  input: { flex: 1, fontSize: fontSize.sm, color: colors.primary },
  flagBadge: {
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  flagText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  waNote: { fontSize: fontSize.xs, color: colors.muted, marginTop: 4, paddingLeft: spacing.sm },
  errorText: { fontSize: fontSize.xs, color: colors.destructive, marginTop: 4 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: colors.graySoft,
    marginRight: spacing.sm, marginTop: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: colors.white, fontWeight: '800', fontSize: 11 },
  termsText: { fontSize: fontSize.sm, color: colors.muted, flex: 1 },
  termsLink: { color: colors.accent, fontWeight: '600' },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  submitBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.graySoft },
  dividerText: { fontSize: fontSize.xs, color: colors.muted, marginHorizontal: spacing.md },
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
  socialLogo: { fontSize: 18, fontWeight: '700' },
  socialText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  loginLink: { alignItems: 'center', marginBottom: spacing.xl },
  loginText: { fontSize: fontSize.sm, color: colors.muted },
  loginBold: { color: colors.accent, fontWeight: '700' },
})
