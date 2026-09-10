import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, RefreshControl,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'
import { formatCurrency } from '../../utils/formatters'

const PERIODS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
]

export default function EarningsScreen() {
  const { user } = useAuthStore()
  const [period, setPeriod] = useState('today')
  const [refreshing, setRefreshing] = useState(false)

  // /api/earnings/barber/:barberId espera el id del PERFIL de barbero, no el
  // del usuario. Se resuelve con /api/barbers/my, igual que en
  // web/src/pages/barber/Earnings.jsx.
  const { data: barberData } = useQuery({
    queryKey: ['my-barber-profile'],
    queryFn: () => api.get('/api/barbers/my').then(r => r.data),
    enabled: !!user?.id,
  })
  const barberId = barberData?.barber?.id || barberData?.id

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['barber-earnings', barberId, period],
    queryFn: () =>
      api.get(`/api/earnings/barber/${barberId}?period=${period}`).then(r => r.data),
    enabled: !!barberId,
  })

  // El controlador envuelve la respuesta en { earnings: {...} }.
  const stats = statsData?.earnings || {}

  // Las secciones de transacciones quedan ocultas hasta que exista la ruta que
  // las alimenta: GET /api/payments/barber/:id no está montada en el backend.
  // payment.routes.js expone cash, appointment, shop, summary, refund, stripe y
  // epayco, pero ninguna por barbero. Una sección vacía se lee como rota.

  const onRefresh = async () => {
    setRefreshing(true)
    await refetchStats()
    setRefreshing(false)
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis Ganancias</Text>
        </View>

        {/* Period tabs */}
        <View style={styles.tabsRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.tab, period === p.key && styles.tabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, period === p.key && styles.tabTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main card */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardAmount}>
            {formatCurrency(stats.totalEarned || 0)}
          </Text>
          <Text style={styles.mainCardPct}>
            Mi porcentaje configurado: {stats.barberPercentage || 0}%
          </Text>
          <Text style={styles.mainCardSub}>
            {stats.cutsCount || 0} cortes
          </Text>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.primary },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    ...shadows.shadowLight,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  tabTextActive: { color: colors.white },
  mainCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(74,44,10,0.1)',
    marginBottom: spacing.md,
  },
  mainCardAmount: { fontSize: 28, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  mainCardPct: { fontSize: fontSize.xs, color: colors.muted, marginBottom: 4 },
  mainCardSub: { fontSize: fontSize.xs, color: colors.muted },
  chartCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.shadowLight,
  },
  chartTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  barLabel: { fontSize: 9, color: colors.muted, marginTop: 4 },
  section: { paddingHorizontal: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  emptyBox: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.shadowLight,
  },
  emptyText: { color: colors.muted, fontSize: fontSize.sm },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.shadowLight,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  txDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  txClient: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  txService: { fontSize: fontSize.xs, color: colors.muted },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  txEarning: { fontSize: fontSize.xs, color: colors.success, marginTop: 2 },
})
