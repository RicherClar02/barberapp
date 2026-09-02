import { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Linking, StatusBar, RefreshControl, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, differenceInMinutes, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../api/axios'
import { colors, fontSize, spacing, radius, shadows, STATUS_COLORS } from '../../constants/theme'
import { formatDate, formatTime, formatCurrency, getStatusLabel } from '../../utils/formatters'
import { hasEnded, OPEN_STATUSES } from '../../utils/shopTime'

const TABS = ['Próximas', 'Historial']

function StarPicker({ value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.md }}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={{ fontSize: 36, color: n <= value ? colors.accent : colors.graySoft }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function MyAppointments({ navigation }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [rateAppt, setRateAppt] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const { data, refetch } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => api.get('/api/appointments/my').then(r => r.data),
  })

  const appointments = data?.appointments || data || []

  // "Próximas" se decidía solo por estado, así que una cita CONFIRMED de las
  // 15:00 seguía ahí a las 15:45 hasta que el barbero la cerrara. Ahora, en
  // cuanto pasa su hora de FIN, se va a Historial. No se le toca el estado:
  // el barbero es el único que la marca completada o no-show.
  const yaTermino = a => hasEnded(a)
  const abierta = a => OPEN_STATUSES.includes(a.status)
  const cerrada = a => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)

  const upcoming = appointments.filter(a => abierta(a) && !yaTermino(a))
    .sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime))

  const history = appointments.filter(a => cerrada(a) || (abierta(a) && yaTermino(a)))
    .sort((a, b) => new Date(b.date + 'T' + b.startTime) - new Date(a.date + 'T' + a.startTime))

  const cancelMutation = useMutation({
    mutationFn: (id) => api.put(`/api/appointments/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries(['my-appointments']),
  })

  const rateMutation = useMutation({
    mutationFn: () =>
      api.post('/api/reviews', {
        appointmentId: rateAppt.id,
        barbershopId: rateAppt.barbershopId || rateAppt.barbershop?.id,
        rating,
        comment,
      }),
    onSuccess: () => {
      qc.invalidateQueries(['my-appointments'])
      setRateAppt(null)
      setRating(5)
      setComment('')
    },
    onError: () => Alert.alert('Error', 'No se pudo enviar la reseña'),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const getCountdown = (appt) => {
    const apptDate = parseISO(`${appt.date}T${appt.startTime}`)
    const mins = differenceInMinutes(apptDate, new Date())
    if (mins < 0) return null
    if (mins < 60) return `Tu cita es en ${mins} minutos`
    const hrs = Math.floor(mins / 60)
    const rem = mins % 60
    return `Tu cita es en ${hrs}h ${rem}m`
  }

  const renderCard = (item) => {
    const isUpcoming = tab === 0
    const countdown = isUpcoming && item.date === format(new Date(), 'yyyy-MM-dd')
      ? getCountdown(item)
      : null
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING
    const canCancel = isUpcoming && ['PENDING', 'CONFIRMED'].includes(item.status)
    const canRate = !isUpcoming && item.status === 'COMPLETED' && !item.review

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AppointmentDetail', { appointment: item })}
        activeOpacity={0.85}
      >
        {countdown && (
          <View style={styles.countdownBanner}>
            <Text style={styles.countdownText}>⏰ {countdown}</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardShop}>{item.barbershop?.name || 'Barbería'}</Text>
            <Text style={styles.cardBarber}>✂️ {item.barber?.name || 'Barbero'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardService}>{item.service?.name}</Text>
          <Text style={styles.cardPrice}>{formatCurrency(item.price || item.service?.price)}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            {formatDate(item.date)} · {formatTime(item.startTime)}
          </Text>
        </View>

        <View style={styles.cardActions}>
          {canCancel && (
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() =>
                Alert.alert('Cancelar cita', '¿Estás seguro? Esta acción notificará a la barbería', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelMutation.mutate(item.id) },
                ])
              }
            >
              <Text style={styles.actionBtnSecondaryText}>Cancelar cita</Text>
            </TouchableOpacity>
          )}
          {item.barbershop?.lat && item.barbershop?.lng && (
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() =>
                Linking.openURL(`https://maps.google.com?q=${item.barbershop.lat},${item.barbershop.lng}`)
              }
            >
              <Text style={styles.actionBtnSecondaryText}>📍 Cómo llegar</Text>
            </TouchableOpacity>
          )}
          {canRate && (
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => { setRateAppt(item); setRating(5); setComment('') }}
            >
              <Text style={styles.actionBtnPrimaryText}>⭐ Calificar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const list = tab === 0 ? upcoming : history

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Citas</Text>
        <View style={styles.tabs}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(i)}
              style={[styles.tab, tab === i && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        renderItem={({ item }) => renderCard(item)}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{tab === 0 ? '📅' : '🕐'}</Text>
            <Text style={styles.emptyTitle}>
              {tab === 0 ? 'No tienes citas próximas' : 'Sin historial de citas'}
            </Text>
            <Text style={styles.emptySub}>
              {tab === 0 ? 'Reserva tu primera cita en una barbería' : 'Tus citas completadas aparecerán aquí'}
            </Text>
          </View>
        }
      />

      {/* Rating modal */}
      <Modal visible={!!rateAppt} transparent animationType="slide" onRequestClose={() => setRateAppt(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setRateAppt(null)} />
        <View style={styles.rateModal}>
          <View style={styles.modalHandle} />
          <Text style={styles.rateTitle}>Calificar visita</Text>
          <Text style={styles.rateShop}>{rateAppt?.barbershop?.name}</Text>
          <Text style={styles.rateBarber}>✂️ {rateAppt?.barber?.name}</Text>

          <StarPicker value={rating} onChange={setRating} />

          <TextInput
            style={styles.rateInput}
            placeholder="Escribe un comentario (opcional)..."
            placeholderTextColor={colors.secondary + '80'}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <TouchableOpacity
            style={[styles.rateSendBtn, rateMutation.isPending && { opacity: 0.6 }]}
            onPress={() => rateMutation.mutate()}
            disabled={rateMutation.isPending}
          >
            <Text style={styles.rateSendText}>
              {rateMutation.isPending ? 'Enviando...' : 'Enviar reseña'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xxl, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  headerTitle: { color: colors.white, fontSize: fontSize.xl, fontWeight: '800', marginBottom: spacing.md },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full, padding: 3 },
  tab: { flex: 1, paddingVertical: spacing.xs + 2, borderRadius: radius.full, alignItems: 'center' },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.cream, fontSize: fontSize.sm, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    marginBottom: spacing.md, overflow: 'hidden', ...shadows.shadowLight,
  },
  countdownBanner: {
    backgroundColor: colors.accent + '25',
    padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.accent + '40',
  },
  countdownText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: spacing.md, paddingBottom: spacing.xs,
  },
  cardShop: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  cardBarber: { fontSize: fontSize.sm, color: colors.secondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  cardService: { fontSize: fontSize.sm, color: colors.secondary },
  cardPrice: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  cardFooter: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs },
  cardDate: { fontSize: fontSize.xs, color: colors.secondary },
  cardActions: {
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.graySoft,
  },
  actionBtnSecondary: {
    flex: 1, borderWidth: 1.5, borderColor: colors.graySoft,
    borderRadius: radius.sm, padding: spacing.xs + 2, alignItems: 'center',
  },
  actionBtnSecondaryText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.secondary },
  actionBtnPrimary: {
    flex: 1, backgroundColor: colors.accent,
    borderRadius: radius.sm, padding: spacing.xs + 2, alignItems: 'center',
  },
  actionBtnPrimaryText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.white },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm },
  emptySub: { fontSize: fontSize.sm, color: colors.secondary, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  rateModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.graySoft,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md,
  },
  rateTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  rateShop: { fontSize: fontSize.md, color: colors.secondary, textAlign: 'center', marginTop: spacing.xs },
  rateBarber: { fontSize: fontSize.sm, color: colors.secondary, textAlign: 'center' },
  rateInput: {
    borderWidth: 1.5, borderColor: colors.graySoft, borderRadius: radius.md,
    padding: spacing.md, height: 88, textAlignVertical: 'top',
    fontSize: fontSize.sm, color: colors.primary,
    backgroundColor: colors.cream, marginBottom: spacing.md,
  },
  rateSendBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  rateSendText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
})
