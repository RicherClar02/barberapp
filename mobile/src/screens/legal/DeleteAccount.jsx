import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'
import { downloadMyData } from '../../utils/dataExport'

const CONFIRMATION_WORD = 'ELIMINAR'

const DELETED = [
  'Tu nombre, correo, teléfono y WhatsApp',
  'Tu foto de perfil',
  'Tus preferencias de notificación',
  'Tus conversaciones con el asistente',
  'Tus cortes acumulados de fidelización',
  'El vínculo entre tú y tus citas y reseñas',
]

const RETAINED = [
  'Registros de facturación, por obligación fiscal (5 años)',
  'Estadísticas anónimas que ya no permiten identificarte',
]

export default function DeleteAccount({ navigation }) {
  const { user, logout } = useAuthStore()
  // Las cuentas creadas con Google o Facebook no tienen contraseña que pedir.
  const hasPassword = !user?.googleId && !user?.facebookId

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit =
    confirmation.trim().toUpperCase() === CONFIRMATION_WORD &&
    (!hasPassword || password.length > 0)

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { shared, uri } = await downloadMyData()
      if (!shared) Alert.alert('Datos descargados', `Tu archivo quedó guardado en:\n${uri}`)
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setExporting(false)
    }
  }

  const submit = async () => {
    setLoading(true)
    try {
      await api.delete('/api/users/me', {
        data: { password: hasPassword ? password : undefined, confirmation: CONFIRMATION_WORD },
      })
      // La cuenta ya no existe: sacar al usuario antes de mostrar nada más,
      // porque cualquier petición posterior devolvería 401.
      await logout()
      Alert.alert(
        'Cuenta eliminada',
        'Tus datos personales fueron eliminados. Te enviamos un correo de confirmación.'
      )
    } catch (err) {
      const status = err.response?.status
      Alert.alert(
        'No se pudo eliminar',
        status === 401
          ? 'La contraseña es incorrecta.'
          : err.response?.data?.message || 'Intenta de nuevo más tarde.'
      )
    } finally {
      setLoading(false)
    }
  }

  const confirm = () => {
    Alert.alert(
      '¿Eliminar tu cuenta?',
      'Esta acción es irreversible. Tus citas futuras se cancelarán y perderás tus cortes acumulados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar definitivamente', style: 'destructive', onPress: submit },
      ]
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Eliminar mi cuenta</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Esta acción es irreversible</Text>
            <Text style={styles.warningText}>
              No podremos recuperar tu cuenta ni tu historial. Si vuelves a registrarte con el
              mismo correo, será una cuenta nueva y vacía.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Se eliminará</Text>
            {DELETED.map(item => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletDelete}>✕</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Se conservará (exigido por la ley)</Text>
            {RETAINED.map(item => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletKeep}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
            <Text style={styles.footnote}>
              La eliminación completa, incluidas las copias de seguridad, tarda máximo 30 días.
            </Text>
          </View>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
            <Text style={styles.exportText}>
              {exporting ? 'Preparando tu archivo...' : '📥 Descargar mis datos antes de eliminar'}
            </Text>
          </TouchableOpacity>

          {hasPassword && (
            <View style={styles.field}>
              <Text style={styles.label}>Confirma tu contraseña</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Tu contraseña"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>
              Escribe <Text style={styles.labelStrong}>{CONFIRMATION_WORD}</Text> para confirmar
            </Text>
            <TextInput
              style={styles.input}
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder={CONFIRMATION_WORD}
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.deleteBtn, (!canSubmit || loading) && styles.deleteBtnDisabled]}
            onPress={confirm}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.deleteBtnText}>
              {loading ? 'Eliminando...' : 'Eliminar definitivamente'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Mejor no, conservar mi cuenta</Text>
          </TouchableOpacity>

          <Text style={styles.help}>
            ¿Dudas? Escríbenos a richerclarosdiaz@gmail.com
          </Text>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.white, fontSize: 32, lineHeight: 34, fontWeight: '300' },
  headerTitle: { flex: 1, color: colors.white, fontSize: fontSize.md, fontWeight: '800', textAlign: 'center' },
  content: { padding: spacing.lg },
  warningBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningTitle: { fontSize: fontSize.sm, fontWeight: '800', color: '#991B1B', marginBottom: 4 },
  warningText: { fontSize: fontSize.xs, lineHeight: 18, color: '#991B1B' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.shadowLight,
  },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm },
  bulletRow: { flexDirection: 'row', marginBottom: 6 },
  bulletDelete: { color: colors.error, fontSize: fontSize.xs, fontWeight: '800', marginRight: spacing.sm, lineHeight: 19 },
  bulletKeep: { color: colors.accent, fontSize: fontSize.sm, marginRight: spacing.sm, lineHeight: 19 },
  bulletText: { flex: 1, fontSize: fontSize.xs, lineHeight: 19, color: colors.black },
  footnote: { fontSize: fontSize.xs, color: colors.muted, marginTop: spacing.sm, fontStyle: 'italic' },
  exportBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  exportText: { color: colors.secondary, fontWeight: '700', fontSize: fontSize.sm },
  field: { marginBottom: spacing.md },
  label: { fontSize: fontSize.xs, color: colors.muted, marginBottom: 6 },
  labelStrong: { fontWeight: '800', color: colors.error },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 52,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  deleteBtn: {
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { color: colors.secondary, fontWeight: '700', fontSize: fontSize.sm },
  help: { textAlign: 'center', fontSize: fontSize.xs, color: colors.muted },
})
