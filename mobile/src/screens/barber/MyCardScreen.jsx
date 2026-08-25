import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, Alert, StatusBar,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'

export default function MyCardScreen() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ specialty: '', bio: '' })

  const { data } = useQuery({
    queryKey: ['barber-card', user?.id],
    queryFn: () => api.get(`/api/barbers/card/${user?.id}`).then(r => r.data),
    enabled: !!user?.id,
    onSuccess: d => setForm({ specialty: d?.specialty || '', bio: d?.bio || '' }),
  })

  const card = data?.barber || data || {}

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/api/barbers/${user?.id}`, payload),
    onSuccess: () => { qc.invalidateQueries(['barber-card']); setEditOpen(false) },
    onError: () => Alert.alert('Error', 'No se pudo actualizar'),
  })

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    })
    if (!result.canceled && result.assets?.[0]) {
      const fd = new FormData()
      fd.append('avatar', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'avatar.jpg' })
      try {
        const res = await api.post(`/api/upload/barber-avatar/${user?.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        await updateUser({ avatar: res.data.url })
        qc.invalidateQueries(['barber-card'])
      } catch {
        Alert.alert('Error', 'No se pudo subir la imagen')
      }
    }
  }

  const stars = (rating) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Text key={i} style={{ fontSize: 16, color: i < Math.round(rating || 0) ? colors.accent : colors.graySoft }}>★</Text>
    ))

  const name = card.name || user?.name || '?'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Alerta de rating bajo (solo en la vista propia del barbero) */}
        {card.lowRating && (
          <View style={styles.lowRatingBanner}>
            <Text style={styles.lowRatingTitle}>⚠ Tu calificación está baja</Text>
            <Text style={styles.lowRatingText}>
              Los clientes ven tu rating antes de reservar.
            </Text>
          </View>
        )}

        {/* Card with gradient */}
        <View style={styles.card}>
          {/* Avatar */}
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
            {card.avatar || user?.avatar ? (
              <Image source={{ uri: card.avatar || user?.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}><Text style={{ fontSize: 10 }}>📷</Text></View>
          </TouchableOpacity>

          {/* Info */}
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardSpecialty}>{card.specialty || 'Barbero Profesional'}</Text>
          <View style={styles.starsRow}>{stars(card.rating)}</View>
          <Text style={styles.ratingText}>({card.reviewCount || 0} reseñas)</Text>
          {card.barbershop?.name && (
            <Text style={styles.cardShop}>{card.barbershop.name}</Text>
          )}

          {/* Gold divider */}
          <View style={styles.goldDivider} />

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{card.today?.total || 0}</Text>
              <Text style={styles.statLabel}>Cortes hoy</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{card.today?.earnings ? `$${Math.floor(card.today.earnings / 1000)}k` : '$0'}</Text>
              <Text style={styles.statLabel}>Ganado hoy</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{card.nextAppointment ? card.nextAppointment : '—'}</Text>
              <Text style={styles.statLabel}>Próxima</Text>
            </View>
          </View>
        </View>

        {/* Edit button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            setForm({ specialty: card.specialty || '', bio: card.bio || '' })
            setEditOpen(true)
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.editBtnText}>✏️  Editar mi tarjeta</Text>
        </TouchableOpacity>

        {/* Last reviews */}
        {card.reviews?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimas reseñas</Text>
            {card.reviews.slice(0, 3).map((r, i) => (
              <View key={r.id || i} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{r.client?.name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{r.client?.name || 'Cliente'}</Text>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Text key={j} style={{ fontSize: 12, color: j < r.rating ? colors.accent : colors.graySoft }}>★</Text>
                      ))}
                    </View>
                  </View>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Services */}
        {card.services?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mis servicios</Text>
            {card.services.map(s => (
              <View key={s.id} style={styles.serviceRow}>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.servicePrice}>
                  {s.price ? `$${Number(s.price).toLocaleString('es-CO')}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditOpen(false)} />
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Editar mi tarjeta</Text>

          <Text style={styles.inputLabel}>Especialidad</Text>
          <TextInput
            style={styles.input}
            value={form.specialty}
            onChangeText={v => setForm(f => ({ ...f, specialty: v }))}
            placeholder="Ej: Especialista en degradados"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.inputLabel}>Descripción</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            value={form.bio}
            onChangeText={v => setForm(f => ({ ...f, bio: v }))}
            placeholder="Cuéntales a tus clientes sobre ti..."
            placeholderTextColor={colors.muted}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.6 }]}
            onPress={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  lowRatingBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: colors.destructive,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  lowRatingTitle: { color: '#991B1B', fontWeight: '700', fontSize: fontSize.sm },
  lowRatingText: { color: '#B91C1C', fontSize: fontSize.xs, marginTop: 2 },
  card: {
    margin: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.shadowMedium,
  },
  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.accent },
  avatarFallback: { backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: fontSize.xl, fontWeight: '700' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: colors.accent, borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  cardName: { color: colors.white, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cardSpecialty: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs },
  starsRow: { flexDirection: 'row', marginBottom: 2 },
  ratingText: { color: 'rgba(255,255,255,0.6)', fontSize: fontSize.xs, marginBottom: 4 },
  cardShop: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs },
  goldDivider: { width: '100%', height: 1, backgroundColor: colors.accent + '40', marginVertical: spacing.md },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.accent + '40', marginVertical: 4 },
  editBtn: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.shadowLight,
    marginBottom: spacing.lg,
  },
  editBtnText: { fontWeight: '700', fontSize: fontSize.sm, color: colors.primary },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.shadowLight,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  reviewName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  reviewStars: { flexDirection: 'row' },
  reviewComment: { fontSize: fontSize.xs, color: colors.muted, fontStyle: 'italic' },
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: radius.sm,
    padding: spacing.md, marginBottom: spacing.xs, ...shadows.shadowLight,
  },
  serviceName: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  servicePrice: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.graySoft,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.lg },
  inputLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.muted, marginBottom: spacing.xs },
  input: {
    borderWidth: 1.5, borderColor: colors.graySoft, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
    fontSize: fontSize.sm, color: colors.primary, backgroundColor: colors.cream,
  },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
})
