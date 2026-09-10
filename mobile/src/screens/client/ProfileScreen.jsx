import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Switch, Alert, StatusBar,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import CitySelectorModal from '../../components/ui/CitySelectorModal'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'
import { downloadMyData } from '../../utils/dataExport'
import { formatCurrency } from '../../utils/formatters'

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    whatsapp: user?.whatsappNumber || '',
    department: user?.department || null,
    city: user?.city || null,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // La sección de fidelización queda oculta hasta que exista la ruta que la
  // alimenta: GET /api/loyalty/my no está montada en el backend. loyalty.routes.js
  // solo expone /:shopId, /shop/:shopId/clients y /redeem, así que esta llamada
  // caía en la ruta comodín con shopId="my". Una sección vacía se lee como rota.

  const { data: prefsData, refetch: refetchPrefs } = useQuery({
    queryKey: ['notif-prefs'],
    queryFn: () => api.get('/api/notifications/preferences').then(r => r.data),
    enabled: !!user?.id,
  })

  const prefs = prefsData?.preferences || prefsData || {}

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put('/api/auth/profile', {
      name: payload.name,
      phone: payload.phone,
      whatsappNumber: payload.whatsapp,
      department: payload.department,
      city: payload.city,
    }),
    onSuccess: async (res) => {
      await updateUser(res.data.user || res.data)
      setEditing(false)
    },
    onError: () => Alert.alert('Error', 'No se pudo actualizar el perfil'),
  })

  const prefsMutation = useMutation({
    mutationFn: (payload) => api.put('/api/notifications/preferences', payload),
    onSuccess: () => refetchPrefs(),
  })

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    })
    if (!result.canceled && result.assets?.[0]) {
      const fd = new FormData()
      fd.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'avatar.jpg' })
      try {
        const res = await api.post(`/api/upload/user-avatar/${user?.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        await updateUser({ avatar: res.data.url })
      } catch {
        Alert.alert('Error', 'No se pudo subir la imagen')
      }
    }
  }

  const handleDataExport = async () => {
    setExporting(true)
    try {
      const { shared, uri } = await downloadMyData()
      if (!shared) {
        Alert.alert('Datos descargados', `Tu archivo quedó guardado en:
${uri}`)
      }
    } catch (err) {
      Alert.alert('Error', err.message)
    } finally {
      setExporting(false)
    }
  }

  const handleLogout = () =>
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{(user?.name?.[0] || '?').toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.editBadge}><Text style={{ fontSize: 12 }}>📷</Text></View>
        </TouchableOpacity>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Mi cuenta */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👤 Mi cuenta</Text>
            <TouchableOpacity onPress={() => {
              if (editing) {
                updateMutation.mutate(form)
              } else {
                setForm({
                  name: user?.name || '', phone: user?.phone || '', whatsapp: user?.whatsappNumber || '',
                  department: user?.department || null, city: user?.city || null,
                })
                setEditing(true)
              }
            }}>
              <Text style={styles.editLink}>
                {editing ? (updateMutation.isPending ? 'Guardando...' : 'Guardar') : 'Editar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {editing ? (
              <>
                <FieldInput label="Nombre" value={form.name} onChangeText={v => set('name', v)} />
                <FieldInput label="Teléfono" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
                <FieldInput label="WhatsApp" value={form.whatsapp} onChangeText={v => set('whatsapp', v)} keyboardType="phone-pad" />
                <TouchableOpacity style={styles.cityField} onPress={() => setCityModalOpen(true)}>
                  <Text style={styles.cityFieldLabel}>Ubicación</Text>
                  <Text style={styles.cityFieldValue}>
                    {form.city ? `📍 ${form.city}${form.department ? `, ${form.department}` : ''}` : 'Elegir departamento y ciudad'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <FieldView label="Nombre" value={user?.name} />
                <FieldView label="Email" value={user?.email} />
                <FieldView label="Teléfono" value={user?.phone || 'No configurado'} />
                <FieldView label="WhatsApp" value={user?.whatsappNumber || 'No configurado'} />
                <FieldView label="Ubicación" value={user?.city ? `${user.city}${user.department ? `, ${user.department}` : ''}` : 'No configurada'} />
              </>
            )}
          </View>
        </View>

        {/* Notificaciones — claves reales del backend:
            preferWhatsapp | preferPush | reminderEnabled */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notificaciones</Text>
          <View style={styles.card}>
            <ToggleRow
              label="Notificaciones por WhatsApp"
              value={!!prefs.preferWhatsapp}
              onToggle={v => prefsMutation.mutate({ preferWhatsapp: v })}
            />
            <View style={styles.fieldDivider} />
            <ToggleRow
              label="Notificaciones push"
              value={!!prefs.preferPush}
              onToggle={v => prefsMutation.mutate({ preferPush: v })}
            />
            <View style={styles.fieldDivider} />
            <ToggleRow
              label="Recordatorios de citas"
              value={!!prefs.reminderEnabled}
              onToggle={v => prefsMutation.mutate({ reminderEnabled: v })}
            />
          </View>
        </View>

        {/* Legal y privacidad — obligatorio para Google Play y App Store:
            leer los términos, exportar los datos y eliminar la cuenta deben
            estar accesibles desde dentro de la app. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal y privacidad</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.menuItemText}>📄 Términos y Condiciones</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.fieldDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Privacy')}>
              <Text style={styles.menuItemText}>🔒 Política de Privacidad</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.fieldDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDataExport} disabled={exporting}>
              <Text style={styles.menuItemText}>
                {exporting ? '📥 Preparando tus datos...' : '📥 Descargar mis datos'}
              </Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.fieldDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DeleteAccount')}>
              <Text style={[styles.menuItemText, { color: colors.error, fontWeight: '600' }]}>
                🗑️ Eliminar mi cuenta
              </Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
            <View style={styles.fieldDivider} />
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemText, { color: colors.secondary }]}>
                Versión 1.0.0
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <CitySelectorModal
        visible={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        onSelect={({ department, city }) => setForm(f => ({ ...f, department, city }))}
      />
    </View>
  )
}

function FieldView({ label, value }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  )
}

function FieldInput({ label, value, onChangeText, keyboardType }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.secondary + '80'}
      />
    </View>
  )
}

function ToggleRow({ label, value, onToggle }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.graySoft, true: colors.accent }}
        thumbColor={value ? colors.white : colors.white}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  cityField: { marginBottom: spacing.sm },
  cityFieldLabel: { fontSize: fontSize.xs, color: colors.muted, marginBottom: 4 },
  cityFieldValue: {
    fontSize: fontSize.sm, color: colors.primary,
    backgroundColor: colors.cream, borderRadius: radius.sm,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.graySoft,
  },
  header: {
    backgroundColor: colors.primary, alignItems: 'center',
    paddingTop: spacing.xxl, paddingBottom: spacing.xl,
  },
  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.accent },
  avatarFallback: { backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '800' },
  editBadge: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: colors.accent, borderRadius: 14,
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  userName: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800', marginTop: spacing.xs },
  userEmail: { color: colors.accent, fontSize: fontSize.sm },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm },
  editLink: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, ...shadows.shadowLight },
  loyaltyCard: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, ...shadows.shadowLight,
  },
  loyaltyInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  loyaltyShop: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  loyaltyProgress: { fontSize: fontSize.xs, color: colors.secondary },
  loyaltyBar: { height: 6, backgroundColor: colors.graySoft, borderRadius: 3, overflow: 'hidden' },
  loyaltyBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.sm,
  },
  fieldLabel: { fontSize: fontSize.sm, color: colors.secondary },
  fieldValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  fieldInput: {
    borderWidth: 1.5, borderColor: colors.graySoft,
    borderRadius: radius.sm, padding: spacing.sm,
    fontSize: fontSize.sm, color: colors.primary, backgroundColor: colors.cream,
  },
  fieldDivider: { height: 1, backgroundColor: colors.graySoft, marginVertical: 2 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  toggleLabel: { fontSize: fontSize.sm, color: colors.primary, flex: 1 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  menuItemText: { fontSize: fontSize.sm, color: colors.primary },
  menuItemArrow: { fontSize: 20, color: colors.graySoft },
  logoutBtn: {
    marginHorizontal: spacing.lg, borderWidth: 1.5, borderColor: colors.error,
    borderRadius: radius.md, padding: spacing.md, alignItems: 'center',
    backgroundColor: colors.error + '10',
  },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: fontSize.md },
})
