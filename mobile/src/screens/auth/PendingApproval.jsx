import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import useAuthStore from '../../store/authStore'

export default function PendingApproval() {
  const { logout, user } = useAuthStore()

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.iconBox}>
        <Text style={styles.iconText}>⏳</Text>
      </View>

      <Text style={styles.title}>Cuenta en revisión</Text>
      <Text style={styles.subtitle}>
        Hola <Text style={styles.name}>{user?.name?.split(' ')[0] || ''}</Text>, tu cuenta de{' '}
        <Text style={styles.role}>{user?.role === 'BARBER' ? 'barbero' : 'dueño de barbería'}</Text>{' '}
        está siendo verificada por el equipo de ESTILO.
      </Text>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📧</Text>
          <Text style={styles.infoText}>Recibirás un correo cuando tu cuenta sea aprobada</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>⏱️</Text>
          <Text style={styles.infoText}>El proceso tarda entre 24 y 48 horas hábiles</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>✅</Text>
          <Text style={styles.infoText}>Una vez aprobado podrás acceder a todas las funciones</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconBox: {
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
  },
  iconText: { fontSize: 48 },
  title: {
    fontSize: 24, fontWeight: '800', color: colors.primary,
    marginBottom: spacing.md, textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm, color: colors.muted,
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl,
  },
  name: { color: colors.primary, fontWeight: '700' },
  role: { color: colors.accent, fontWeight: '700' },
  infoCard: {
    width: '100%', backgroundColor: colors.white,
    borderRadius: radius.md, padding: spacing.lg,
    marginBottom: spacing.xl, gap: spacing.md,
    shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoIcon: { fontSize: 18, marginTop: 1 },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.secondary, lineHeight: 20 },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  logoutBtnText: { color: '#991B1B', fontSize: fontSize.sm, fontWeight: '700' },
})
