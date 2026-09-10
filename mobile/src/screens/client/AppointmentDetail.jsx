import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, StatusBar, Alert,
} from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/axios'
import { colors, fontSize, spacing, radius, shadows, STATUS_COLORS } from '../../constants/theme'
import { formatDate, formatTime, formatCurrency, getStatusLabel } from '../../utils/formatters'

export default function AppointmentDetail({ route, navigation }) {
  const { appointment: appt } = route.params || {}
  const qc = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: () => api.put(`/api/appointments/${appt.id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries(['my-appointments'])
      navigation.goBack()
    },
    onError: () => Alert.alert('Error', 'No se pudo cancelar la cita'),
  })

  if (!appt) return null

  const statusColor = STATUS_COLORS[appt.status] || STATUS_COLORS.PENDING
  const canCancel = ['PENDING', 'CONFIRMED'].includes(appt.status)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de cita</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg }}>
        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {getStatusLabel(appt.status)}
          </Text>
        </View>

        {/* Main info */}
        <View style={styles.card}>
          <InfoRow label="Barbería" value={appt.barbershop?.name || 'Barbería'} />
          <InfoRow label="Barbero" value={appt.barber?.name || 'Asignado'} />
          <InfoRow label="Servicio" value={appt.service?.name} />
          <View style={styles.divider} />
          <InfoRow label="Fecha" value={formatDate(appt.date)} />
          <InfoRow label="Hora inicio" value={formatTime(appt.startTime)} />
          <InfoRow label="Hora fin" value={formatTime(appt.endTime)} />
          <InfoRow label="Duración" value="40 minutos" />
          <View style={styles.divider} />
          <InfoRow label="Precio" value={formatCurrency(appt.price || appt.service?.price)} bold />
          <InfoRow label="Pago" value={appt.paymentMethod || 'Efectivo'} />
        </View>

        {/* Notes */}
        {appt.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notas</Text>
            <Text style={styles.notesText}>{appt.notes}</Text>
          </View>
        )}

        {/* Contact */}
        {/* Barbershop no tiene columna whatsapp: el mismo phone sirve para
            llamar y para abrir la conversación de WhatsApp. */}
        {(appt.barbershop?.phone || (appt.barbershop?.lat && appt.barbershop?.lng)) && (
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Contactar barbería</Text>
            <View style={styles.contactBtns}>
              {appt.barbershop?.phone && (
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => Linking.openURL(`tel:${appt.barbershop.phone}`)}
                >
                  <Text style={styles.contactBtnIcon}>📞</Text>
                  <Text style={styles.contactBtnText}>Llamar</Text>
                </TouchableOpacity>
              )}
              {appt.barbershop?.phone && (
                <TouchableOpacity
                  style={[styles.contactBtn, styles.contactBtnWa]}
                  onPress={() => Linking.openURL(`https://wa.me/${appt.barbershop.phone.replace(/\D/g, '')}`)}
                >
                  <Text style={styles.contactBtnIcon}>💬</Text>
                  <Text style={[styles.contactBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                </TouchableOpacity>
              )}
              {appt.barbershop?.lat && appt.barbershop?.lng && (
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => Linking.openURL(`https://maps.google.com?q=${appt.barbershop.lat},${appt.barbershop.lng}`)}
                >
                  <Text style={styles.contactBtnIcon}>📍</Text>
                  <Text style={styles.contactBtnText}>Cómo llegar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Cancel */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() =>
              Alert.alert('Cancelar cita', '¿Estás seguro? Esta acción notificará a la barbería.', [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Sí, cancelar',
                  style: 'destructive',
                  onPress: () => cancelMutation.mutate(),
                },
              ])
            }
            disabled={cancelMutation.isPending}
          >
            <Text style={styles.cancelBtnText}>
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar cita'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  )
}

function InfoRow({ label, value, bold }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, bold && { fontWeight: '800', color: colors.primary }]}>{value}</Text>
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
  statusBanner: {
    borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusText: { fontSize: fontSize.md, fontWeight: '800' },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.shadowLight,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  infoLabel: { fontSize: fontSize.sm, color: colors.secondary },
  infoValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  divider: { height: 1, backgroundColor: colors.graySoft, marginVertical: spacing.sm },
  notesCard: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.shadowLight,
  },
  notesLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.secondary, marginBottom: spacing.xs },
  notesText: { fontSize: fontSize.sm, color: colors.primary },
  contactCard: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.md, ...shadows.shadowLight,
  },
  contactTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.secondary, marginBottom: spacing.md },
  contactBtns: { flexDirection: 'row', gap: spacing.sm },
  contactBtn: {
    flex: 1, alignItems: 'center', backgroundColor: colors.cream,
    borderRadius: radius.md, padding: spacing.sm,
  },
  contactBtnWa: { backgroundColor: '#25D36610' },
  contactBtnIcon: { fontSize: 20, marginBottom: 2 },
  contactBtnText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  cancelBtn: {
    borderWidth: 1.5, borderColor: colors.error,
    borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', backgroundColor: colors.error + '10',
  },
  cancelBtnText: { color: colors.error, fontWeight: '700', fontSize: fontSize.md },
})
