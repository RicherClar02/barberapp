import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isToday, isSameDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function dotColor(count) {
  if (count <= 0) return 'transparent'
  if (count <= 2) return '#27AE60'
  if (count <= 5) return '#F59E0B'
  if (count <= 8) return '#F97316'
  return '#EF4444'
}

export default function CalendarScreen({ navigation }) {
  const { user } = useAuthStore()
  const [month, setMonth] = useState(new Date())

  const year = format(month, 'yyyy')
  const monthNum = format(month, 'MM')

  const { data } = useQuery({
    queryKey: ['barber-calendar', user?.id, year, monthNum],
    queryFn: () =>
      api.get(`/api/calendar/barber/${user?.id}/month/${year}/${monthNum}`).then(r => r.data),
    enabled: !!user?.id,
  })

  const byDate = data?.days || {}

  const monthStart = startOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(month) })
  const startOffset = (getDay(monthStart) + 6) % 7

  const totalAppts = Object.values(byDate).reduce((s, d) => s + (d?.total || 0), 0)
  const workedDays = Object.values(byDate).filter(d => (d?.total || 0) > 0).length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendario</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setMonth(m => subMonths(m, 1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {format(month, "MMMM yyyy", { locale: es })}
          </Text>
          <TouchableOpacity onPress={() => setMonth(m => addMonths(m, 1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.calBox}>
          <View style={styles.weekRow}>
            {WEEK_DAYS.map(d => (
              <Text key={d} style={styles.weekDayLabel}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {Array(startOffset).fill(null).map((_, i) => (
              <View key={`pad-${i}`} style={styles.cell} />
            ))}
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const count = byDate[key]?.total || 0
              const today = isToday(day)

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.cell}
                  onPress={() => count > 0 && navigation.navigate('Mi Agenda', { screen: 'Mi Agenda', params: { date: key } })}
                >
                  <View style={[styles.dayCircle, today && styles.dayCircleToday]}>
                    <Text style={[styles.cellNum, today && styles.cellNumToday]}>
                      {format(day, 'd')}
                    </Text>
                  </View>
                  <View style={[styles.dot, { backgroundColor: dotColor(count) }]} />
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.legend}>
          {[
            { color: '#27AE60', label: '1-2 citas' },
            { color: '#F59E0B', label: '3-5 citas' },
            { color: '#F97316', label: '6-8 citas' },
            { color: '#EF4444', label: '9+ citas' },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Resumen del mes</Text>
        <View style={styles.statsRow}>
          {[
            { n: totalAppts, l: 'Citas totales' },
            { n: workedDays, l: 'Días trabajados' },
            { n: workedDays > 0 ? (totalAppts / workedDays).toFixed(1) : '0', l: 'Promedio/día' },
          ].map(s => (
            <View key={s.l} style={styles.statCard}>
              <Text style={styles.statNum}>{s.n}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xxl, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  headerTitle: { color: colors.white, fontSize: fontSize.xl, fontWeight: '800', marginBottom: spacing.sm },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  navBtn: { padding: spacing.xs },
  navArrow: { color: colors.accent, fontSize: 24, fontWeight: '700' },
  monthText: {
    flex: 1, color: colors.white, fontSize: fontSize.md, fontWeight: '600',
    textAlign: 'center', textTransform: 'capitalize',
  },
  calBox: {
    margin: spacing.md, backgroundColor: colors.white,
    borderRadius: radius.lg, padding: spacing.md, ...shadows.shadowLight,
  },
  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekDayLabel: { flex: 1, textAlign: 'center', fontSize: fontSize.xs, fontWeight: '700', color: colors.secondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 1 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayCircleToday: { backgroundColor: colors.primary },
  cellNum: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  cellNumToday: { color: colors.white, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs, color: colors.secondary },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: '800', color: colors.primary,
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', ...shadows.shadowLight,
  },
  statNum: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.secondary, marginTop: 2, textAlign: 'center' },
})
