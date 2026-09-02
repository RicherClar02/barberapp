import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Linking, RefreshControl, StatusBar, TextInput,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import Toast from 'react-native-toast-message'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { colors, fontSize, spacing, radius, shadows, STATUS_COLORS } from '../../constants/theme'
import { formatTime, getStatusLabel, formatCurrency } from '../../utils/formatters'
import { needsClosing } from '../../utils/shopTime'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8)

const STATUS_LEFT_COLOR = {
  COMPLETED: '#27AE60',
  IN_PROGRESS: '#C49A6C',
  CONFIRMED: '#185FA5',
  PENDING: '#C49A6C',
  CANCELLED: '#EF4444',
  NO_SHOW: '#9E8670',
}

const STATUS_BG = {
  PENDING: '#FEF9C3',
  CONFIRMED: '#DBEAFE',
  IN_PROGRESS: '#EDE9FE',
  COMPLETED: '#DCFCE7',
  CANCELLED: '#FEE2E2',
  NO_SHOW: '#F3F4F6',
}

export default function AgendaScreen() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const scrollRef = useRef(null)
  const [date, setDate] = useState(new Date())
  const [selected, setSelected] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  // Gestión de imprevistos del barbero (menú ⋮ en cada cita)
  const [menuFor, setMenuFor] = useState(null)
  const [cancelFor, setCancelFor] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [reschedFor, setReschedFor] = useState(null)
  const [reschedDate, setReschedDate] = useState(null)
  const [reschedSlot, setReschedSlot] = useState(null)
  const [reschedReason, setReschedReason] = useState('')

  const dateStr = format(date, 'yyyy-MM-dd')
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

  const { data, refetch } = useQuery({
    queryKey: ['barber-agenda', user?.id, dateStr],
    queryFn: () => api.get(`/api/appointments/barber/${user?.id}?date=${dateStr}`).then(r => r.data),
    enabled: !!user?.id,
  })

  const appointments = data?.appointments || data || []

  const now = new Date()
  const nowHour = now.getHours() + now.getMinutes() / 60

  // Citas cuya hora de fin ya pasó y que nadie cerró. No se les cambia el
  // estado: se listan aparte, arriba, para que el barbero las cierre a mano.
  // Van en un bloque propio y no reordenadas dentro de la agenda porque la
  // agenda es una línea de tiempo por hora: moverlas de fila rompería la
  // lectura cronológica, que es justo para lo que sirve.
  const porCerrar = appointments
    .filter(a => needsClosing(a))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

  const completedToday = appointments.filter(a => a.status === 'COMPLETED').length
  const totalToday = appointments.length
  const earnedToday = appointments.filter(a => a.status === 'COMPLETED').reduce((s, a) => s + (a.price || 0), 0)
  const nextAppt = appointments.find(a =>
    a.status === 'CONFIRMED' && parseInt(a.startTime?.split(':')[0]) >= now.getHours()
  )

  useEffect(() => {
    if (!isToday) return
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, (nowHour - 8) * 88 - 40), animated: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [isToday])

  const confirm = useMutation({
    mutationFn: (id) => api.put(`/api/appointments/${id}/confirm`),
    onSuccess: () => { qc.invalidateQueries(['barber-agenda']); setSelected(null) },
  })
  const complete = useMutation({
    mutationFn: (id) => api.put(`/api/appointments/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries(['barber-agenda']); setSelected(null) },
  })
  const cancel = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/api/appointments/${id}/cancel`, { cancelReason: reason }),
    onSuccess: () => {
      qc.invalidateQueries(['barber-agenda'])
      setSelected(null); setCancelFor(null); setCancelReason('')
      Toast.show({ type: 'success', text1: 'Cita cancelada', text2: 'El cliente fue notificado' })
    },
    onError: (err) => Toast.show({ type: 'error', text1: err.response?.data?.message || 'Error al cancelar' }),
  })

  const reschedule = useMutation({
    mutationFn: ({ id, newDate, newStartTime, reason }) =>
      api.put(`/api/appointments/${id}/reschedule`, { newDate, newStartTime, reason }),
    onSuccess: () => {
      qc.invalidateQueries(['barber-agenda'])
      setReschedFor(null); setReschedDate(null); setReschedSlot(null); setReschedReason('')
      Toast.show({ type: 'success', text1: 'Cita reprogramada', text2: 'El cliente fue notificado' })
    },
    onError: (err) => Toast.show({ type: 'error', text1: err.response?.data?.message || 'Error al reprogramar' }),
  })

  // Slots libres para reprogramar (usa el endpoint de disponibilidad existente)
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['resched-slots', reschedFor?.id, reschedDate],
    queryFn: () => api.get(
      `/api/appointments/availability/${reschedFor.barbershopId}/${reschedFor.barberId}/${reschedDate}?serviceId=${reschedFor.serviceId}`
    ).then(r => r.data),
    enabled: !!reschedFor && !!reschedDate,
  })
  const freeSlots = slotsData?.slots || []

  const nextDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))

  const openReschedule = (appt) => {
    setMenuFor(null)
    setReschedFor(appt)
    setReschedDate(format(new Date(), 'yyyy-MM-dd'))
    setReschedSlot(null)
    setReschedReason('')
  }

  const openCancel = (appt) => {
    setMenuFor(null)
    setCancelFor(appt)
    setCancelReason('')
  }

  const submitReschedule = () => {
    if (!reschedSlot) return Toast.show({ type: 'error', text1: 'Selecciona un horario disponible' })
    if (!reschedReason.trim()) return Toast.show({ type: 'error', text1: 'Indica el motivo de la reprogramación' })
    reschedule.mutate({ id: reschedFor.id, newDate: reschedDate, newStartTime: reschedSlot, reason: reschedReason.trim() })
  }

  const submitCancel = () => {
    if (!cancelReason.trim()) return Toast.show({ type: 'error', text1: 'El motivo es obligatorio' })
    cancel.mutate({ id: cancelFor.id, reason: cancelReason.trim() })
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const getApptsForHour = (hour) =>
    appointments.filter(a => parseInt(a.startTime?.split(':')[0]) === hour)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerDate}>
          {format(date, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
        </Text>
        <Text style={styles.headerBarber}>{user?.name}</Text>

        {/* Date nav */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => setDate(d => subDays(d, 1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.dateNavText}>
            {isToday ? 'Hoy' : format(date, "d MMM", { locale: es })}
          </Text>
          <TouchableOpacity onPress={() => setDate(d => addDays(d, 1))} style={styles.navBtn}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mini stat cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✂️</Text>
          <Text style={styles.statValue}>{completedToday}/{totalToday}</Text>
          <Text style={styles.statLabel}>Cortes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>{formatCurrency(earnedToday)}</Text>
          <Text style={styles.statLabel}>Ganado hoy</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏰</Text>
          <Text style={styles.statValue}>{nextAppt ? formatTime(nextAppt.startTime) : '—'}</Text>
          <Text style={styles.statLabel}>Próxima</Text>
        </View>
      </View>

      {/* Timeline */}
      <ScrollView
        ref={scrollRef}
        style={styles.timeline}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {porCerrar.length > 0 && (
          <View style={styles.porCerrarBox}>
            <Text style={styles.porCerrarTitle}>
              {porCerrar.length === 1
                ? '1 cita terminó y sigue sin cerrar'
                : `${porCerrar.length} citas terminaron y siguen sin cerrar`}
            </Text>
            <Text style={styles.porCerrarHint}>
              Tocá cada una para marcarla completada o no-show.
            </Text>
            {porCerrar.map(a => (
              <TouchableOpacity
                key={a.id}
                style={styles.porCerrarItem}
                onPress={() => setSelected(a)}
                activeOpacity={0.8}
              >
                <Text style={styles.porCerrarHora}>
                  {formatTime(a.startTime)} → {formatTime(a.endTime)}
                </Text>
                <Text style={styles.porCerrarNombre} numberOfLines={1}>
                  {a.client?.name || 'Cliente'}
                </Text>
                <Text style={styles.porCerrarChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Current time line */}
        {isToday && (
          <View style={[styles.nowLine, { top: (nowHour - 8) * 88 }]}>
            <View style={styles.nowDot} />
            <View style={styles.nowBar} />
          </View>
        )}

        {HOURS.map(hour => {
          const appts = getApptsForHour(hour)
          const isCurrent = isToday && Math.floor(nowHour) === hour

          return (
            <View key={hour} style={styles.hourRow}>
              <Text style={[styles.hourLabel, isCurrent && styles.hourLabelNow]}>
                {hour}:00
              </Text>
              <View style={styles.hourContent}>
                {appts.length === 0 ? (
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptySlotText}>
                      Disponible {hour}:00 → {hour}:40
                    </Text>
                  </View>
                ) : (
                  appts.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        styles.apptCard,
                        { backgroundColor: STATUS_BG[a.status] || colors.white },
                        { borderLeftColor: STATUS_LEFT_COLOR[a.status] || colors.accent },
                      ]}
                      onPress={() => setSelected(a)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.apptRow}>
                        <Text style={styles.apptTime}>{formatTime(a.startTime)} → {formatTime(a.endTime)}</Text>
                        <View style={styles.apptRightRow}>
                          <Text style={styles.apptPrice}>{formatCurrency(a.price || 0)}</Text>
                          {['PENDING', 'CONFIRMED'].includes(a.status) && (
                            <TouchableOpacity
                              style={styles.menuBtn}
                              onPress={() => setMenuFor(a)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={styles.menuBtnText}>⋮</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <View style={styles.apptRow}>
                        <View style={styles.apptClientRow}>
                          <View style={styles.apptAvatar}>
                            <Text style={styles.apptAvatarText}>{a.client?.name?.[0]?.toUpperCase() || '?'}</Text>
                          </View>
                          <View>
                            <Text style={styles.apptClient}>{a.client?.name}</Text>
                            <Text style={styles.apptService}>{a.service?.name}</Text>
                          </View>
                        </View>
                      </View>
                      {a.status === 'IN_PROGRESS' && a.client?.whatsapp && (
                        <TouchableOpacity
                          style={styles.waBtn}
                          onPress={() => Linking.openURL(`https://wa.me/${a.client.whatsapp.replace(/\D/g, '')}`)}
                        >
                          <Text style={styles.waBtnText}>💬 WhatsApp</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          )
        })}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)} />
        <View style={styles.modal}>
          {selected && (
            <>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{selected.service?.name}</Text>

              {[
                { l: 'Cliente', v: selected.client?.name },
                { l: 'Hora', v: `${formatTime(selected.startTime)} → ${formatTime(selected.endTime)}` },
                { l: 'Precio', v: formatCurrency(selected.price || 0) },
              ].map(row => (
                <View key={row.l} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.l}</Text>
                  <Text style={styles.infoValue}>{row.v}</Text>
                </View>
              ))}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estado</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selected.status]?.bg }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[selected.status]?.text }]}>
                    {getStatusLabel(selected.status)}
                  </Text>
                </View>
              </View>

              {selected.client?.phone && (
                <TouchableOpacity style={styles.contactBtn}
                  onPress={() => Linking.openURL(`tel:${selected.client.phone}`)}>
                  <Text style={styles.contactBtnText}>📞 Llamar al cliente</Text>
                </TouchableOpacity>
              )}
              {selected.client?.whatsapp && (
                <TouchableOpacity style={[styles.contactBtn, styles.contactBtnWa]}
                  onPress={() => Linking.openURL(`https://wa.me/${selected.client.whatsapp.replace(/\D/g, '')}`)}>
                  <Text style={[styles.contactBtnText, { color: colors.whatsapp }]}>💬 WhatsApp</Text>
                </TouchableOpacity>
              )}

              <View style={styles.actions}>
                {selected.status === 'PENDING' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => confirm.mutate(selected.id)}>
                    <Text style={styles.actionBtnText}>Confirmar</Text>
                  </TouchableOpacity>
                )}
                {['CONFIRMED', 'IN_PROGRESS'].includes(selected.status) && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]}
                    onPress={() => complete.mutate(selected.id)}>
                    <Text style={styles.actionBtnText}>Completar</Text>
                  </TouchableOpacity>
                )}
                {['PENDING', 'CONFIRMED'].includes(selected.status) && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                      onPress={() => { const a = selected; setSelected(null); openReschedule(a) }}>
                      <Text style={styles.actionBtnText}>Reprogramar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive }]}
                      onPress={() => { const a = selected; setSelected(null); openCancel(a) }}>
                      <Text style={styles.actionBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Menú ⋮ de gestión de cita */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuFor(null)} />
        <View style={styles.menuModal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            {menuFor?.client?.name} — {menuFor && formatTime(menuFor.startTime)}
          </Text>
          <TouchableOpacity style={styles.menuOption} onPress={() => openReschedule(menuFor)}>
            <Text style={styles.menuOptionText}>📅 Reprogramar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuOption, styles.menuOptionDanger]} onPress={() => openCancel(menuFor)}>
            <Text style={[styles.menuOptionText, { color: colors.destructive }]}>✕ Cancelar cita</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Modal cancelar con motivo obligatorio */}
      <Modal visible={!!cancelFor} transparent animationType="slide" onRequestClose={() => setCancelFor(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setCancelFor(null)} />
        <View style={styles.menuModal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Cancelar cita</Text>
          <Text style={styles.modalSubtitle}>
            Se notificará a {cancelFor?.client?.name} y se avisará al siguiente en lista de espera.
          </Text>
          <Text style={styles.inputLabel}>Motivo (obligatorio)</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Ej: Tuve una calamidad y no puedo atender"
            placeholderTextColor={colors.muted}
            value={cancelReason}
            onChangeText={setCancelReason}
            multiline
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.graySoft }]}
              onPress={() => setCancelFor(null)}>
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive }]}
              onPress={submitCancel} disabled={cancel.isPending}>
              <Text style={styles.actionBtnText}>{cancel.isPending ? 'Cancelando...' : 'Confirmar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal reprogramar: día + hora disponible + motivo */}
      <Modal visible={!!reschedFor} transparent animationType="slide" onRequestClose={() => setReschedFor(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setReschedFor(null)} />
        <View style={[styles.menuModal, { maxHeight: '85%' }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Reprogramar cita</Text>
          <Text style={styles.modalSubtitle}>
            {reschedFor?.client?.name} — {reschedFor?.service?.name}
          </Text>

          <Text style={styles.inputLabel}>Nueva fecha</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {nextDays.map(d => {
              const ds = format(d, 'yyyy-MM-dd')
              const active = ds === reschedDate
              return (
                <TouchableOpacity
                  key={ds}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => { setReschedDate(ds); setReschedSlot(null) }}
                >
                  <Text style={[styles.dayChipDay, active && styles.dayChipTextActive]}>
                    {format(d, 'EEE', { locale: es })}
                  </Text>
                  <Text style={[styles.dayChipNum, active && styles.dayChipTextActive]}>
                    {format(d, 'd')}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <Text style={styles.inputLabel}>Hora disponible</Text>
          {loadingSlots ? (
            <Text style={styles.slotsEmpty}>Cargando horarios...</Text>
          ) : freeSlots.length === 0 ? (
            <Text style={styles.slotsEmpty}>No hay horarios libres este día</Text>
          ) : (
            <View style={styles.slotsGrid}>
              {freeSlots.map(s => {
                const active = s.startTime === reschedSlot
                return (
                  <TouchableOpacity
                    key={s.startTime}
                    style={[styles.slotChip, active && styles.slotChipActive]}
                    onPress={() => setReschedSlot(s.startTime)}
                  >
                    <Text style={[styles.slotChipText, active && styles.dayChipTextActive]}>
                      {formatTime(s.startTime)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          <Text style={styles.inputLabel}>Motivo (obligatorio)</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Ej: Imprevisto personal, debo mover la cita"
            placeholderTextColor={colors.muted}
            value={reschedReason}
            onChangeText={setReschedReason}
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.graySoft }]}
              onPress={() => setReschedFor(null)}>
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={submitReschedule} disabled={reschedule.isPending}>
              <Text style={styles.actionBtnText}>{reschedule.isPending ? 'Guardando...' : 'Reprogramar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerDate: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  headerBarber: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.sm, marginTop: 2, marginBottom: spacing.sm },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  navBtn: { padding: spacing.xs },
  navArrow: { color: colors.accent, fontSize: 28, fontWeight: '700' },
  dateNavText: { flex: 1, color: colors.white, fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadows.shadowLight,
  },
  statIcon: { fontSize: 18, marginBottom: 2 },
  statValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 9, color: colors.muted, marginTop: 1 },
  timeline: { flex: 1, paddingHorizontal: spacing.lg, position: 'relative' },
  porCerrarBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  porCerrarTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#92400E' },
  porCerrarHint: { fontSize: fontSize.xs, color: '#92400E', marginTop: 2, marginBottom: spacing.sm },
  porCerrarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  porCerrarHora: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  porCerrarNombre: { flex: 1, fontSize: fontSize.sm, color: colors.secondary },
  porCerrarChevron: { fontSize: fontSize.lg, color: colors.secondary },

  nowLine: {
    position: 'absolute',
    left: spacing.lg + 48,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  nowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  nowBar: { flex: 1, height: 2, backgroundColor: '#EF4444' },
  hourRow: {
    flexDirection: 'row',
    minHeight: 88,
    borderTopWidth: 1,
    borderTopColor: colors.graySoft + '60',
  },
  hourLabel: { width: 44, fontSize: fontSize.xs, color: colors.muted, paddingTop: spacing.sm },
  hourLabelNow: { color: colors.accent, fontWeight: '700' },
  hourContent: { flex: 1, paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  emptySlot: { paddingVertical: spacing.sm },
  emptySlotText: { fontSize: fontSize.xs, color: colors.muted, fontStyle: 'italic' },
  apptCard: {
    borderRadius: radius.sm,
    borderLeftWidth: 4,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    ...shadows.shadowLight,
  },
  apptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  apptTime: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  apptPrice: { fontSize: fontSize.xs, fontWeight: '700', color: colors.muted },
  apptClientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  apptAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  apptAvatarText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  apptClient: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  apptService: { fontSize: fontSize.xs, color: colors.muted },
  waBtn: {
    backgroundColor: colors.whatsapp + '20',
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  waBtnText: { fontSize: fontSize.xs, color: colors.whatsapp, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, minHeight: 400,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.graySoft,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.muted },
  infoValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  contactBtn: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center', marginTop: spacing.sm,
    backgroundColor: colors.primary + '10',
  },
  contactBtnWa: { borderColor: colors.whatsapp, backgroundColor: colors.whatsapp + '10' },
  contactBtnText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  actionBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  apptRightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuBtn: { paddingHorizontal: 4 },
  menuBtnText: { fontSize: 18, fontWeight: '900', color: colors.muted },
  menuModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  menuOption: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    marginBottom: spacing.sm,
  },
  menuOptionDanger: { backgroundColor: '#FEE2E2' },
  menuOptionText: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary },
  modalSubtitle: { fontSize: fontSize.sm, color: colors.muted, marginBottom: spacing.md },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary, marginTop: spacing.md, marginBottom: spacing.xs },
  reasonInput: {
    borderWidth: 1, borderColor: colors.graySoft, borderRadius: radius.md,
    padding: spacing.sm, minHeight: 64, textAlignVertical: 'top',
    fontSize: fontSize.sm, color: colors.primary, backgroundColor: colors.cream,
  },
  dayChip: {
    width: 52, paddingVertical: spacing.sm, marginRight: spacing.xs,
    borderRadius: radius.md, backgroundColor: colors.cream, alignItems: 'center',
  },
  dayChipActive: { backgroundColor: colors.primary },
  dayChipDay: { fontSize: fontSize.xs, color: colors.muted, textTransform: 'capitalize' },
  dayChipNum: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  dayChipTextActive: { color: colors.white },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  slotChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.full, backgroundColor: colors.cream,
    borderWidth: 1, borderColor: colors.graySoft,
  },
  slotChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotChipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  slotsEmpty: { fontSize: fontSize.sm, color: colors.muted, fontStyle: 'italic', paddingVertical: spacing.sm },
})
