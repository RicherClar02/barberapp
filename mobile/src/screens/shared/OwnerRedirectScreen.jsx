import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import useAuthStore from '../../store/authStore'

export default function OwnerRedirectScreen() {
  const { logout } = useAuthStore()

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✂️</Text>
      <Text style={styles.title}>ESTILO</Text>
      <Text style={styles.subtitle}>Panel de Administración</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Acceso web requerido</Text>
        <Text style={styles.cardText}>
          El panel de administración está disponible en la versión web. Ingresa desde tu navegador en:
        </Text>
        <View style={styles.urlBox}>
          <Text style={styles.urlText}>estilo.com/owner/dashboard</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.accent,
    marginBottom: spacing.xl,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  cardText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  urlBox: {
    backgroundColor: 'rgba(196,154,108,0.2)',
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: spacing.xs,
  },
  urlText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.5)',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FCA5A5',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
})
