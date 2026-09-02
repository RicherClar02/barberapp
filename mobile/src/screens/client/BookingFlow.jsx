import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, ActivityIndicator,
} from 'react-native'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../api/axios'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters'
import { shopNow, dayKeysFrom } from '../../utils/shopTime'

const STEPS = ['Barbero', 'Fecha', 'Hora', 'Confirmar']

function canAdvance(step, barber, date, slot) {
  if (step === 0) return !!barber
  if (step === 1) return !!date
  if (step === 2) return !!slot
  return true
}

// El validador responde { message: 'Datos inválidos', errors: [{ field, error }] }.
// Mostrar solo `message` dejaba al usuario con "Datos inválidos" pelado y sin
// forma de saber qué campo lo estaba rechazando: el detalle está en `errors`.
function bookingErrorMessage(e) {
  const data = e?.response?.data
  const detalles = Array.isArray(data?.errors)
    ? data.errors.map(x => x.error || x.msg).filter(Boolean)
    : []

  if (detalles.length) return `${data.message}: ${detalles.join('. ')}`
  if (data?.message) return data.message
  if (e?.message) return e.message
  return 'No se pudo reservar la cita'
}

function SummaryRow({ label, value, bold }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, bold && { fontWeight: '800', fontSize: fontSize.md }]}>{value}</Text>
    </View>
  )
}

export default function BookingFlow({ route, navigation }) {
  const { shopId, shop, serviceId, service } = route.params || {}

  const [step, setStep] = useState(0)
  const [barber, setBarber] = useState(null)
  const [date, setDate] = useState(null)
  const [slot, setSlot] = useState(null)
  const [notes, setNotes] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [discount, setDiscount] = useState(null)
  const [success, setSuccess] = useState(false)

  // La fila arranca en el día de la BARBERÍA, no en el del teléfono. Antes se
  // armaba con startOfDay(new Date()) del dispositivo: un teléfono en otra zona
  // (o en UTC, como los emuladores) ofrecía un día distinto del que el backend
  // considera hoy, y la reserva salía corrida. Se trabaja con claves
  // "YYYY-MM-DD" de punta a punta para no volver a cruzar local y UTC.
  const today = shopNow().date
  const days = dayKeysFrom(today, 31)

  const { data: barbersData } = useQuery({
    queryKey: ['booking-barbers', shopId],
    queryFn: () => api.get(`/api/barbers/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  // serviceId es obligatorio: el backend calcula la duración del slot a partir
  // del servicio y responde 400 sin él. El barbero también: hay que elegir uno
  // concreto, así que no se consultan slots hasta tenerlo.
  const slotsEnabled = !!shopId && !!barber?.id && !!date && !!serviceId
  const {
    data: slotsData,
    isLoading: loadingSlots,
    isError: slotsFailed,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['booking-slots', shopId, barber?.id, date, serviceId],
    queryFn: () =>
      api
        .get(`/api/appointments/availability/${shopId}/${barber.id}/${date}`, {
          params: { serviceId },
        })
        .then(r => r.data),
    enabled: slotsEnabled,
  })

  const barbers = barbersData?.barbers || barbersData || []
  // El backend responde { slots: [{ startTime, endTime }], duration, serviceName }
  // y ya excluye los ocupados y los que pasaron: lo que llega acá es reservable.
  const slots = slotsData?.slots || []
  // La duración sale del servicio real, no de un "40 min" escrito en duro que
  // mentía en cuanto una barbería configuraba un servicio de otra duración.
  const slotDuration = slotsData?.duration ?? service?.duration ?? null

  const applyPromo = useMutation({
    mutationFn: () =>
      api.post('/api/offers/validate', { code: promoCode, serviceId, shopId }),
    onSuccess: res => setDiscount(res.data),
    onError: () => Alert.alert('Código inválido', 'El código no es válido para este servicio'),
  })

  const bookMutation = useMutation({
    mutationFn: () =>
      api.post('/api/appointments', {
        // El backend espera barbershopId. Se mandaba shopId, así que el campo
        // llegaba vacío y el validador cortaba con 400 "Datos inválidos" antes
        // de tocar la lógica de reserva: nunca se pudo confirmar una cita.
        barbershopId: shopId,
        barberId: barber?.id || undefined,
        serviceId,
        date,
        startTime: slot,
        notes: notes || undefined,
        promoCode: discount ? promoCode : undefined,
      }),
    onSuccess: () => setSuccess(true),
    onError: e => Alert.alert('No se pudo reservar', bookingErrorMessage(e)),
  })

  const basePrice = service?.price || 0
  const discountAmount = discount
    ? discount.type === 'PERCENT'
      ? basePrice * (discount.value / 100)
      : discount.value
    : 0
  const finalPrice = basePrice - discountAmount

  // Success screen
  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>¡Cita reservada!</Text>
        <Text style={styles.successSub}>
          Recibirás un recordatorio 15 minutos antes
        </Text>
        <View style={styles.successCard}>
          <Text style={styles.successDetail}>{shop?.name}</Text>
          <Text style={styles.successDetail}>{service?.name} · {formatCurrency(finalPrice)}</Text>
          {date && <Text style={styles.successDetail}>{formatDate(date)}</Text>}
          {slot && <Text style={styles.successDetail}>{formatTime(slot)}</Text>}
        </View>
        <TouchableOpacity
          style={styles.successBtn}
          onPress={() => navigation.navigate('Mis Citas')}
        >
          <Text style={styles.successBtnText}>Ver mis citas</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.secondary, textAlign: 'center' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reservar cita</Text>
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.progressStep}>
            <View style={[styles.progressDot, i <= step && { backgroundColor: colors.accent }]}>
              <Text style={styles.progressNum}>{i + 1}</Text>
            </View>
            <Text style={[styles.progressLabel, i === step && styles.progressLabelActive]}>
              {s}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
        {/* Service banner */}
        <View style={styles.serviceBanner}>
          <Text style={styles.serviceBannerName}>{service?.name}</Text>
          <Text style={styles.serviceBannerInfo}>
            {formatCurrency(service?.price)}{slotDuration ? ` · ${slotDuration} min` : ''}
          </Text>
        </View>

        {/* STEP 0 — Barbero */}
        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>¿Con quién te atenderás?</Text>
            {barbers.map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.barberItem, barber?.id === b.id && styles.barberItemSelected]}
                onPress={() => setBarber(b)}
              >
                <Text style={{ fontSize: 28 }}>✂️</Text>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.barberItemName}>{b.name}</Text>
                  <Text style={styles.barberItemSub}>
                    ⭐ {(b.rating || 0).toFixed(1)} · {b.specialty || 'Barbero'}
                  </Text>
                </View>
                {barber?.id === b.id && (
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: fontSize.lg }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* STEP 1 — Fecha */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>¿Qué día te viene bien?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
            >
              {days.map(key => {
                const selected = date === key
                // La clave es el día de calendario; se convierte a Date local
                // solo para rotular, nunca para decidir qué fecha se envía.
                const [y, m, d] = key.split('-').map(Number)
                const label = new Date(y, m - 1, d)
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => { setDate(key); setSlot(null) }}
                    style={[styles.dayChip, selected && styles.dayChipSelected]}
                  >
                    <Text style={[styles.dayChipDay, selected && { color: colors.cream }]}>
                      {key === today ? 'hoy' : format(label, 'EEE', { locale: es })}
                    </Text>
                    <Text style={[styles.dayChipNum, selected && { color: colors.white }]}>
                      {format(label, 'd')}
                    </Text>
                    <Text style={[styles.dayChipMon, selected && { color: colors.cream }]}>
                      {format(label, 'MMM', { locale: es })}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* STEP 2 — Hora */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>¿A qué hora?</Text>
            {date && <Text style={styles.stepSubtitle}>{formatDate(date)}</Text>}

            {/* Cada situación dice lo que realmente pasó. Antes las cuatro
                caían en "No hay horarios disponibles", que era falso en tres. */}
            {!serviceId ? (
              <View style={styles.noSlotsBox}>
                <Text style={styles.errorTitle}>Falta elegir el servicio</Text>
                <Text style={styles.noSlotsText}>
                  No podemos calcular los horarios sin saber qué servicio querés.
                  Volvé a la barbería y elegí uno.
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.sm }}>
                  <Text style={styles.linkText}>← Elegir servicio</Text>
                </TouchableOpacity>
              </View>
            ) : loadingSlots ? (
              <View style={styles.noSlotsBox}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={[styles.noSlotsText, { marginTop: spacing.sm }]}>
                  Buscando horarios disponibles...
                </Text>
              </View>
            ) : slotsFailed ? (
              <View style={styles.noSlotsBox}>
                <Text style={styles.errorTitle}>No pudimos cargar los horarios</Text>
                <Text style={styles.noSlotsText}>
                  {slotsError?.response?.data?.message ||
                    'Revisá tu conexión e intentá de nuevo.'}
                </Text>
                <TouchableOpacity onPress={() => refetchSlots()} style={{ marginTop: spacing.sm }}>
                  <Text style={styles.linkText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.noSlotsBox}>
                <Text style={styles.noSlotsText}>
                  {slotsData?.message ||
                    (slotsData?.date && slotsData.date === slotsData.today
                      ? 'Hoy ya no quedan turnos. Probá con otro día.'
                      : 'No hay horarios disponibles para este día')}
                </Text>
                <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: spacing.sm }}>
                  <Text style={styles.linkText}>← Cambiar fecha</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map(s => (
                  <TouchableOpacity
                    key={s.startTime}
                    onPress={() => setSlot(s.startTime)}
                    style={[
                      styles.slotChip,
                      slot === s.startTime && styles.slotChipSelected,
                    ]}
                  >
                    <Text style={[
                      styles.slotText,
                      slot === s.startTime && { color: colors.white },
                    ]}>
                      {formatTime(s.startTime)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* STEP 3 — Confirmar */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Confirmar reserva</Text>

            <View style={styles.confirmCard}>
              <SummaryRow label="Barbería" value={shop?.name} />
              <SummaryRow label="Barbero" value={barber?.name || 'Disponible'} />
              <SummaryRow label="Servicio" value={service?.name} />
              <SummaryRow label="Fecha" value={date ? formatDate(date) : ''} />
              <SummaryRow label="Hora" value={slot ? formatTime(slot) : ''} />
              <SummaryRow label="Duración" value={slotDuration ? `${slotDuration} minutos` : '—'} />
              <View style={styles.confirmDivider} />
              {discount && (
                <SummaryRow
                  label="Descuento"
                  value={`-${discount.type === 'PERCENT' ? `${discount.value}%` : formatCurrency(discount.value)}`}
                />
              )}
              <SummaryRow label="Total" value={formatCurrency(finalPrice)} bold />
            </View>

            {/* Promo code */}
            <View style={styles.promoRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Código promocional (opcional)"
                placeholderTextColor={colors.secondary + '80'}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.promoApplyBtn, !promoCode && { opacity: 0.4 }]}
                onPress={() => applyPromo.mutate()}
                disabled={!promoCode || applyPromo.isPending}
              >
                <Text style={styles.promoApplyText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
            {discount && (
              <Text style={styles.discountApplied}>
                ✅ Descuento aplicado: -{discount.type === 'PERCENT' ? `${discount.value}%` : formatCurrency(discount.value)}
              </Text>
            )}

            {/* Notes */}
            <TextInput
              style={styles.notesInput}
              placeholder="Notas adicionales (opcional)"
              placeholderTextColor={colors.secondary + '80'}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.prevBtnText}>← Atrás</Text>
          </TouchableOpacity>
        )}
        {step < 3 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canAdvance(step, barber, date, slot) && { opacity: 0.45 }]}
            disabled={!canAdvance(step, barber, date, slot)}
            onPress={() => setStep(s => s + 1)}
          >
            <Text style={styles.nextBtnText}>Siguiente →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, bookMutation.isPending && { opacity: 0.6 }]}
            onPress={() => bookMutation.mutate()}
            disabled={bookMutation.isPending}
          >
            <Text style={styles.nextBtnText}>
              {bookMutation.isPending ? 'Reservando...' : '✅ Confirmar reserva'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    backgroundColor: colors.primary, paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { marginRight: spacing.md },
  backBtnText: { color: colors.white, fontSize: 28, fontWeight: '700' },
  headerTitle: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800' },
  progress: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.graySoft,
  },
  progressStep: { flex: 1, alignItems: 'center', gap: 4 },
  progressDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.graySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  progressNum: { fontSize: fontSize.xs, fontWeight: '700', color: colors.white },
  progressLabel: { fontSize: fontSize.xs, color: colors.secondary, textAlign: 'center' },
  progressLabelActive: { color: colors.primary, fontWeight: '700' },
  serviceBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.shadowLight,
  },
  serviceBannerName: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  serviceBannerInfo: { fontSize: fontSize.sm, color: colors.secondary },
  stepTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary, marginBottom: spacing.md },
  stepSubtitle: { fontSize: fontSize.sm, color: colors.secondary, marginBottom: spacing.md },
  barberItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 2, borderColor: colors.graySoft, ...shadows.shadowLight,
  },
  barberItemSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '10' },
  barberItemName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  barberItemSub: { fontSize: fontSize.xs, color: colors.secondary, marginTop: 2 },
  dayChip: {
    width: 64, alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 2, borderColor: colors.graySoft,
  },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipDay: { fontSize: fontSize.xs, color: colors.secondary, textTransform: 'capitalize' },
  dayChipNum: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  dayChipMon: { fontSize: fontSize.xs, color: colors.secondary, textTransform: 'capitalize' },
  noSlotsBox: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.xl, alignItems: 'center', ...shadows.shadowLight,
  },
  noSlotsText: { color: colors.secondary, fontSize: fontSize.sm, textAlign: 'center' },
  errorTitle: {
    color: colors.error, fontSize: fontSize.md, fontWeight: '700',
    textAlign: 'center', marginBottom: spacing.xs,
  },
  linkText: { color: colors.accent, fontWeight: '600' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChip: {
    width: '30%', padding: spacing.sm, alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.graySoft,
  },
  slotChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotChipDisabled: { backgroundColor: colors.graySoft + '50', borderColor: colors.graySoft },
  slotText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  confirmCard: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.shadowLight,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { fontSize: fontSize.sm, color: colors.secondary },
  summaryValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  confirmDivider: { height: 1, backgroundColor: colors.graySoft, marginVertical: spacing.sm },
  promoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  promoInput: {
    flex: 1, borderWidth: 1.5, borderColor: colors.graySoft,
    borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48,
    fontSize: fontSize.sm, color: colors.primary, backgroundColor: colors.white,
  },
  promoApplyBtn: {
    backgroundColor: colors.secondary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, justifyContent: 'center',
  },
  promoApplyText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  discountApplied: { fontSize: fontSize.sm, color: colors.success, marginBottom: spacing.sm, fontWeight: '600' },
  notesInput: {
    borderWidth: 1.5, borderColor: colors.graySoft, borderRadius: radius.md,
    padding: spacing.md, height: 88, textAlignVertical: 'top',
    fontSize: fontSize.sm, color: colors.primary, backgroundColor: colors.white,
  },
  navRow: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.lg, backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.graySoft,
  },
  prevBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.graySoft,
    borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
  },
  prevBtnText: { color: colors.secondary, fontWeight: '600' },
  nextBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  nextBtnText: { color: colors.white, fontWeight: '800', fontSize: fontSize.md },
  successContainer: {
    flex: 1, backgroundColor: colors.cream,
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  successIcon: { fontSize: 80, marginBottom: spacing.md },
  successTitle: { fontSize: fontSize.xxl, fontWeight: '900', color: colors.primary, marginBottom: spacing.sm },
  successSub: { fontSize: fontSize.sm, color: colors.secondary, textAlign: 'center', marginBottom: spacing.xl },
  successCard: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.lg, width: '100%', marginBottom: spacing.xl, ...shadows.shadowLight,
  },
  successDetail: { fontSize: fontSize.sm, color: colors.secondary, marginBottom: spacing.xs, textAlign: 'center' },
  successBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
  },
  successBtnText: { color: colors.white, fontWeight: '800', fontSize: fontSize.md },
})
