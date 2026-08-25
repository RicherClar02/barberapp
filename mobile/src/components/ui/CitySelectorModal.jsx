import { useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import * as Location from 'expo-location'
import Toast from 'react-native-toast-message'
import api from '../../api/axios'
import { colors, fontSize, spacing, radius } from '../../constants/theme'

// Modal selector de ubicación Colombia: departamento → ciudad,
// con opción de detectar la ciudad por GPS (reverse geocoding).
// onSelect({ department, city }) se llama al elegir una ciudad.
export default function CitySelectorModal({
  visible, onClose, onSelect, defaultCity, onSetDefault,
}) {
  const [department, setDepartment] = useState(null)
  const [detecting, setDetecting] = useState(false)

  const { data: deptData, isLoading: loadingDepts } = useQuery({
    queryKey: ['co-departments'],
    queryFn: () => api.get('/api/locations/departments').then(r => r.data),
    enabled: visible,
  })

  const { data: citiesData, isLoading: loadingCities } = useQuery({
    queryKey: ['co-cities', department],
    queryFn: () => api.get(`/api/locations/cities/${encodeURIComponent(department)}`).then(r => r.data),
    enabled: !!department,
  })

  const departments = deptData?.departments || []
  const cities = citiesData?.cities || []

  const pickCity = (city) => {
    onSelect({ department, city })
    setDepartment(null)
    onClose()
  }

  // Detectar ciudad con GPS + reverse geocoding de expo-location
  const useGps = async () => {
    try {
      setDetecting(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permiso de ubicación denegado' })
        return
      }
      const loc = await Location.getCurrentPositionAsync({})
      const places = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      })
      const place = places?.[0]
      const city = place?.city || place?.subregion
      if (!city) {
        Toast.show({ type: 'error', text1: 'No pudimos detectar tu ciudad' })
        return
      }
      onSelect({ department: place?.region || null, city })
      setDepartment(null)
      onClose()
    } catch {
      Toast.show({ type: 'error', text1: 'Error al obtener tu ubicación' })
    } finally {
      setDetecting(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modal}>
        <View style={styles.handle} />
        <Text style={styles.title}>
          {department ? `Ciudades de ${department}` : '¿Dónde estás?'}
        </Text>

        {defaultCity ? (
          <Text style={styles.note}>
            Tu ciudad por defecto es {defaultCity}. Este cambio es temporal.
          </Text>
        ) : null}

        <TouchableOpacity style={styles.gpsBtn} onPress={useGps} disabled={detecting}>
          {detecting
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={styles.gpsBtnText}>📡 Usar mi ubicación GPS</Text>
          }
        </TouchableOpacity>

        {department && (
          <TouchableOpacity onPress={() => setDepartment(null)}>
            <Text style={styles.backLink}>‹ Volver a departamentos</Text>
          </TouchableOpacity>
        )}

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {!department ? (
            loadingDepts
              ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
              : departments.map(d => (
                <TouchableOpacity key={d} style={styles.item} onPress={() => setDepartment(d)}>
                  <Text style={styles.itemText}>{d}</Text>
                  <Text style={styles.itemArrow}>›</Text>
                </TouchableOpacity>
              ))
          ) : (
            loadingCities
              ? <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
              : cities.map(c => (
                <TouchableOpacity key={c} style={styles.item} onPress={() => pickCity(c)}>
                  <Text style={styles.itemText}>{c}</Text>
                </TouchableOpacity>
              ))
          )}
        </ScrollView>

        {onSetDefault && (
          <TouchableOpacity style={styles.setDefaultBtn} onPress={onSetDefault}>
            <Text style={styles.setDefaultText}>Establecer como mi ciudad</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: colors.graySoft,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  note: { fontSize: fontSize.xs, color: colors.muted, marginBottom: spacing.sm },
  gpsBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center', marginBottom: spacing.sm,
  },
  gpsBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  backLink: { color: colors.accent, fontWeight: '600', fontSize: fontSize.sm, marginBottom: spacing.xs },
  list: { flexGrow: 0 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1, borderBottomColor: colors.graySoft + '60',
  },
  itemText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  itemArrow: { fontSize: fontSize.lg, color: colors.muted },
  setDefaultBtn: {
    marginTop: spacing.sm, padding: spacing.sm, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.md,
  },
  setDefaultText: { color: colors.accent, fontWeight: '700', fontSize: fontSize.sm },
})
