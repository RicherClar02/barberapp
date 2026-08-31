import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, StatusBar, Platform,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useQuery } from '@tanstack/react-query'
import * as Location from 'expo-location'
import api from '../../api/axios'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'

const { height } = Dimensions.get('window')

const RADIUS_OPTIONS = [
  { key: 0.5, label: '500m' },
  { key: 1, label: '1km' },
  { key: 2, label: '2km' },
  { key: 5, label: '5km' },
]

// Bogotá fallback
const DEFAULT_REGION = {
  latitude: 4.7110, longitude: -74.0721,
  latitudeDelta: 0.05, longitudeDelta: 0.05,
}

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null)
  const [location, setLocation] = useState(null)
  const [radiusKm, setRadiusKm] = useState(2)
  const [selected, setSelected] = useState(null)
  const [listView, setListView] = useState(false)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({})
        setLocation(loc.coords)
      }
    })()
  }, [])

  const { data } = useQuery({
    queryKey: ['map-barbershops', location?.latitude, location?.longitude, radiusKm],
    queryFn: () => {
      const base = '/api/barbershops?limit=30'
      const locParams = location
        ? `&lat=${location.latitude}&lng=${location.longitude}&radius=${radiusKm}`
        : ''
      return api.get(base + locParams).then(r => r.data)
    },
  })

  const shops = data?.barbershops || data || []

  const centerOnUser = async () => {
    if (!location) {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({})
      setLocation(loc.coords)
      return
    }
    mapRef.current?.animateToRegion({
      latitude: location.latitude, longitude: location.longitude,
      latitudeDelta: 0.02, longitudeDelta: 0.02,
    }, 500)
  }

  const region = location
    ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : DEFAULT_REGION

  const goToShop = (shop) =>
    navigation.navigate('Inicio', {
      screen: 'BarbershopDetail',
      params: { shopId: shop.id, shop },
    })

  return (
    <View style={styles.container}>
      <StatusBar barStyle={listView ? 'dark-content' : 'light-content'} backgroundColor={colors.primary} />

      {/* Map */}
      {!listView && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* El backend devuelve latitude/longitude (los nombres del modelo).
              Antes se leía shop.lat/shop.lng, que no existen: el mapa quedaba
              vacío aunque la barbería tuviera coordenadas cargadas. */}
          {shops.map(shop =>
            shop.latitude != null && shop.longitude != null ? (
              <Marker
                key={shop.id}
                coordinate={{ latitude: parseFloat(shop.latitude), longitude: parseFloat(shop.longitude) }}
                onPress={() => { setSelected(shop) }}
                pinColor={shop.plan === 'PREMIUM' ? colors.accent : colors.secondary}
              />
            ) : null
          )}
        </MapView>
      )}

      {/* List view */}
      {listView && (
        <FlatList
          data={shops}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron barberías cerca</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.listCard} onPress={() => goToShop(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listCity}>{item.city}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.listRating}>⭐ {(item.rating || 0).toFixed(1)}</Text>
                {item.distance != null && (
                  <Text style={styles.listDist}>
                    {item.distance < 1
                      ? `${Math.round(item.distance * 1000)}m`
                      : `${item.distance.toFixed(1)} km`}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Top controls */}
      <View style={styles.topBar}>
        <View style={styles.chipsRow}>
          {RADIUS_OPTIONS.map(r => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRadiusKm(r.key)}
              style={[styles.chip, radiusKm === r.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, radiusKm === r.key && styles.chipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.toggleBtn} onPress={() => { setSelected(null); setListView(v => !v) }}>
          <Text style={styles.toggleBtnText}>{listView ? '🗺️ Mapa' : '📋 Lista'}</Text>
        </TouchableOpacity>
      </View>

      {/* FAB */}
      {!listView && (
        <TouchableOpacity style={styles.fab} onPress={centerOnUser}>
          <Text style={styles.fabIcon}>📍</Text>
        </TouchableOpacity>
      )}

      {/* Bottom sheet */}
      {selected && !listView && (
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.sheetClose} onPress={() => setSelected(null)}>
            <Text style={{ color: colors.secondary, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
          {selected.plan === 'PREMIUM' && (
            <View style={styles.sheetBadge}>
              <Text style={styles.sheetBadgeText}>★ PREMIUM</Text>
            </View>
          )}
          <Text style={styles.sheetName}>{selected.name}</Text>
          <Text style={styles.sheetCity}>{selected.city}</Text>
          <Text style={styles.sheetRating}>⭐ {(selected.rating || 0).toFixed(1)}</Text>
          {selected.distance != null && (
            <Text style={styles.sheetDist}>
              {selected.distance < 1
                ? `${Math.round(selected.distance * 1000)}m de distancia`
                : `${selected.distance.toFixed(1)} km de distancia`}
            </Text>
          )}
          <TouchableOpacity style={styles.sheetBtn} onPress={() => { setSelected(null); goToShop(selected) }}>
            <Text style={styles.sheetBtnText}>Ver barbería →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  topBar: {
    position: 'absolute', top: spacing.xxl + spacing.md,
    left: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  chipsRow: { flexDirection: 'row', gap: spacing.xs, flex: 1 },
  chip: {
    backgroundColor: colors.white, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    ...shadows.shadowLight,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  chipTextActive: { color: colors.white },
  toggleBtn: {
    backgroundColor: colors.white, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    ...shadows.shadowLight,
  },
  toggleBtnText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  fab: {
    position: 'absolute', bottom: 200, right: spacing.lg,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.white, alignItems: 'center',
    justifyContent: 'center', ...shadows.shadowMedium,
  },
  fabIcon: { fontSize: 24 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, ...shadows.shadowMedium,
  },
  sheetClose: { position: 'absolute', top: spacing.md, right: spacing.lg, padding: spacing.xs },
  sheetBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.full, marginBottom: spacing.xs,
  },
  sheetBadgeText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '800' },
  sheetName: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  sheetCity: { fontSize: fontSize.sm, color: colors.secondary, marginTop: 2 },
  sheetRating: { fontSize: fontSize.sm, marginTop: spacing.xs },
  sheetDist: { fontSize: fontSize.sm, color: colors.secondary },
  sheetBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginTop: spacing.md,
  },
  sheetBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  listContent: { paddingTop: 96, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  listCard: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, ...shadows.shadowLight,
  },
  listName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  listCity: { fontSize: fontSize.xs, color: colors.secondary },
  listRating: { fontSize: fontSize.sm, color: colors.primary },
  listDist: { fontSize: fontSize.xs, color: colors.secondary },
  emptyText: { textAlign: 'center', color: colors.secondary, padding: spacing.xl, fontSize: fontSize.sm },
})
