import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  FlatList, RefreshControl, Dimensions, Animated, StatusBar, Image,
  ActivityIndicator,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import * as Location from 'expo-location'
import Toast from 'react-native-toast-message'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import BarbershopCard from '../../components/barbershop/BarbershopCard'
import CitySelectorModal from '../../components/ui/CitySelectorModal'
import EmptyState from '../../components/ui/EmptyState'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'
import { getGreeting, getGreetingEmoji } from '../../utils/formatters'

const { width } = Dimensions.get('window')
const AD_WIDTH = width - spacing.lg * 2

export default function HomeScreen({ navigation }) {
  const { user, updateUser } = useAuthStore()
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [adIndex, setAdIndex] = useState(0)
  const adScrollRef = useRef()
  // Selector de ciudad (la ciudad por defecto viene del perfil del usuario)
  const [cityModalOpen, setCityModalOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState(user?.city || null)
  const [selectedDept, setSelectedDept] = useState(user?.department || null)

  const isTemporaryCity = !!selectedCity && selectedCity !== user?.city

  const handleCitySelect = ({ department, city }) => {
    setSelectedDept(department)
    setSelectedCity(city)
  }

  // Guardar la ciudad seleccionada como ciudad por defecto del usuario
  const setAsDefaultCity = async () => {
    try {
      await api.put('/api/auth/profile', { city: selectedCity, department: selectedDept })
      await updateUser({ city: selectedCity, department: selectedDept })
      Toast.show({ type: 'success', text1: `${selectedCity} es ahora tu ciudad por defecto` })
    } catch {
      Toast.show({ type: 'error', text1: 'No se pudo guardar tu ciudad' })
    }
  }

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({})
        setLocation(loc.coords)
      }
    })()
  }, [])

  // Auto-scroll ads every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAdIndex(i => i + 1)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!adScrollRef.current) return
    adScrollRef.current.scrollTo({ x: adIndex * AD_WIDTH, animated: true })
  }, [adIndex])

  const { data: adsData, refetch: refetchAds } = useQuery({
    queryKey: ['active-ads'],
    queryFn: () => api.get('/api/ads/active').then(r => r.data),
  })

  const cityParam = selectedCity ? `&city=${encodeURIComponent(selectedCity)}` : ''

  const { data: premiumData, refetch: refetchPremium } = useQuery({
    queryKey: ['premium-barbershops', selectedCity],
    queryFn: () => api.get(`/api/barbershops?plan=PREMIUM&limit=10${cityParam}`).then(r => r.data),
  })

  const { data: nearbyData, refetch: refetchNearby } = useQuery({
    queryKey: ['nearby-barbershops', location?.latitude, location?.longitude, selectedCity],
    queryFn: () => {
      let url = `/api/barbershops?limit=10${cityParam}`
      if (location) url += `&lat=${location.latitude}&lng=${location.longitude}&radius=5`
      return api.get(url).then(r => r.data)
    },
  })

  const {
    data: searchData,
    isFetching: searchLoading,
    isError: searchFailed,
    refetch: retrySearch,
  } = useQuery({
    queryKey: ['search', search],
    queryFn: () => api.get(`/api/search?q=${encodeURIComponent(search)}`).then(r => r.data),
    enabled: search.length >= 2,
  })

  const ads = adsData?.ads || []
  const premium = premiumData?.barbershops || premiumData || []
  const nearby = nearbyData?.barbershops || nearbyData || []
  const searchResults = searchData?.barbershops || searchData?.results || []

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchAds(), refetchPremium(), refetchNearby()])
    setRefreshing(false)
  }

  const goToShop = (shop) => navigation.navigate('BarbershopDetail', { shopId: shop.id, shop })

  const handleAdClick = async (ad) => {
    try { await api.post(`/api/ads/click/${ad.id}`) } catch {}
    if (ad.barbershopId) navigation.navigate('BarbershopDetail', { shopId: ad.barbershopId })
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {getGreeting()}, {user?.name?.split(' ')[0]} {getGreetingEmoji()}
            </Text>
            <TouchableOpacity style={styles.cityChip} onPress={() => setCityModalOpen(true)}>
              <Text style={styles.cityChipText}>
                📍 {selectedCity || 'Elige tu ciudad'} ▾
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.avatar}>
              {user?.avatar
                ? <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                : <Text style={styles.avatarText}>{initials}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar barbería..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Nota de cambio temporal de ciudad */}
        {isTemporaryCity && user?.city && (
          <View style={styles.tempCityNote}>
            <Text style={styles.tempCityText}>
              Tu ciudad por defecto es {user.city}. Este cambio es temporal.
            </Text>
            <TouchableOpacity onPress={setAsDefaultCity}>
              <Text style={styles.tempCityAction}>Establecer como mi ciudad</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resultados de la búsqueda. Antes solo se pintaba la lista cuando
            tenía filas, así que una búsqueda sin resultados se veía igual que un
            buscador muerto: sin carga, sin vacío y sin error. */}
        {search.length >= 2 && (
          searchLoading ? (
            <View style={styles.searchStatus}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.searchStatusText}>Buscando barberías...</Text>
            </View>
          ) : searchFailed ? (
            <EmptyState
              title="No pudimos buscar"
              subtitle="Revisa tu conexión e intenta de nuevo."
              actionLabel="Reintentar"
              onAction={retrySearch}
            />
          ) : searchResults.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              subtitle={`No encontramos barberías que coincidan con “${search}”.`}
            />
          ) : (
            <View style={styles.searchResults}>
              {searchResults.slice(0, 5).map(s => (
                <TouchableOpacity key={s.id} style={styles.searchResultItem} onPress={() => { setSearch(''); goToShop(s) }}>
                  <Text style={styles.searchResultName}>{s.name}</Text>
                  <Text style={styles.searchResultCity}>{s.city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* Ads carousel */}
        {ads.length > 0 && (
          <View style={styles.section}>
            <ScrollView
              ref={adScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / AD_WIDTH)
                setAdIndex(idx)
              }}
            >
              {ads.map(ad => (
                <TouchableOpacity key={ad.id} onPress={() => handleAdClick(ad)} style={styles.adCard}>
                  {ad.mediaUrl
                    ? <Image source={{ uri: ad.mediaUrl }} style={styles.adImage} resizeMode="cover" />
                    : <View style={[styles.adImage, styles.adFallback]}><Text style={{ fontSize: 40 }}>📢</Text></View>
                  }
                  <View style={styles.adOverlay}>
                    <View style={styles.adBadge}><Text style={styles.adBadgeText}>Publicidad</Text></View>
                    <View style={styles.adBottom}>
                      <Text style={styles.adShopName}>{ad.barbershop?.name || ad.title}</Text>
                      <TouchableOpacity style={styles.adSeeMore}>
                        <Text style={styles.adSeeMoreText}>Ver más</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Dots */}
            <View style={styles.dotsRow}>
              {ads.map((_, i) => (
                <View key={i} style={[styles.dot, i === adIndex % ads.length && styles.dotActive]} />
              ))}
            </View>
          </View>
        )}

        {/* Premium barbershops */}
        {premium.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Destacadas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {premium.map(s => (
                <BarbershopCard key={s.id} shop={s} onPress={() => goToShop(s)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Nearby */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Cerca de ti</Text>
          {nearby.length === 0 ? (
            <Text style={styles.emptyText}>Activa tu ubicación para ver barberías cercanas</Text>
          ) : (
            <View>
              {nearby.slice(0, 5).map(s => (
                <NearbyCard key={s.id} shop={s} onPress={() => goToShop(s)} />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Selector de ciudad (departamento → ciudad / GPS) */}
      <CitySelectorModal
        visible={cityModalOpen}
        onClose={() => setCityModalOpen(false)}
        onSelect={handleCitySelect}
        defaultCity={user?.city}
      />
    </View>
  )
}

function NearbyCard({ shop, onPress }) {
  const planBadge =
    shop.plan === 'PREMIUM' ? { bg: '#FDF0E0', text: '#8B5E0A', label: 'Premium 👑' }
    : shop.plan === 'STANDARD' ? { bg: '#F5EFE6', text: '#4A2C0A', label: 'Estándar' }
    : { bg: '#F3F4F6', text: '#6B7280', label: 'Básico' }

  return (
    <TouchableOpacity style={styles.nearbyCard} onPress={onPress} activeOpacity={0.85}>
      {/* Cover image */}
      <View style={styles.nearbyImageWrapper}>
        {shop.coverImage
          ? <Image source={{ uri: shop.coverImage }} style={styles.nearbyImage} resizeMode="cover" />
          : <View style={[styles.nearbyImage, styles.nearbyImageFallback]}><Text style={{ fontSize: 32 }}>✂️</Text></View>
        }
        {/* Logo overlap */}
        <View style={styles.nearbyLogo}>
          {shop.logo
            ? <Image source={{ uri: shop.logo }} style={styles.nearbyLogoImg} />
            : <Text style={{ fontSize: 18 }}>✂️</Text>
          }
        </View>
        {/* Plan badge */}
        <View style={[styles.nearbyPlanBadge, { backgroundColor: planBadge.bg }]}>
          <Text style={[styles.nearbyPlanText, { color: planBadge.text }]}>{planBadge.label}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.nearbyInfo}>
        <Text style={styles.nearbyName} numberOfLines={1}>{shop.name}</Text>
        <View style={styles.nearbyRow}>
          <Text style={styles.nearbyMeta}>📍 {shop.address || shop.city}</Text>
        </View>
        <View style={styles.nearbyRow}>
          <Text style={styles.nearbyRating}>⭐ {(shop.rating || 0).toFixed(1)}</Text>
          <Text style={styles.nearbyReviews}> ({shop.reviewCount || 0})</Text>
          {shop.startingPrice && (
            <Text style={styles.nearbyPrice}> · Desde ${Number(shop.startingPrice).toLocaleString('es-CO')}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.reserveBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.reserveBtnText}>Reservar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: { fontSize: fontSize.lg, fontWeight: '700', color: colors.white },
  cityChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: 4,
  },
  cityChipText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600' },
  tempCityNote: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: '#FDF0E0',
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tempCityText: { flex: 1, fontSize: fontSize.xs, color: colors.secondary },
  tempCityAction: { fontSize: fontSize.xs, fontWeight: '700', color: colors.accent },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.white },
  clearSearch: { fontSize: 14, color: colors.white + '80', padding: spacing.xs },
  searchStatus: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.lg,
  },
  searchStatusText: { fontSize: fontSize.sm, color: colors.secondary },
  searchResults: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    ...shadows.shadowMedium,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchResultItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.graySoft },
  searchResultName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  searchResultCity: { fontSize: fontSize.xs, color: colors.muted },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  hScroll: { paddingRight: spacing.lg },
  adCard: {
    width: AD_WIDTH, height: 180,
    borderRadius: radius.lg, overflow: 'hidden', marginRight: spacing.md,
    ...shadows.shadowLight,
  },
  adImage: { width: '100%', height: '100%' },
  adFallback: { backgroundColor: colors.graySoft, alignItems: 'center', justifyContent: 'center' },
  adOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  adBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  adBadgeText: { color: colors.white, fontSize: 10, fontWeight: '600' },
  adBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  adShopName: { color: colors.white, fontWeight: '700', fontSize: fontSize.md, flex: 1 },
  adSeeMore: {
    borderWidth: 1, borderColor: colors.white,
    borderRadius: 4, paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  adSeeMoreText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm, gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.graySoft },
  dotActive: { backgroundColor: colors.accent, width: 18 },
  nearbyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.shadowLight,
  },
  nearbyImageWrapper: { position: 'relative', height: 160 },
  nearbyImage: { width: '100%', height: '100%' },
  nearbyImageFallback: { backgroundColor: colors.graySoft, alignItems: 'center', justifyContent: 'center' },
  nearbyLogo: {
    position: 'absolute', bottom: -18, left: spacing.md,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 2, borderColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.shadowLight,
  },
  nearbyLogoImg: { width: 44, height: 44, borderRadius: 22 },
  nearbyPlanBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.full,
  },
  nearbyPlanText: { fontSize: 10, fontWeight: '700' },
  nearbyInfo: { padding: spacing.md, paddingTop: spacing.lg + 4 },
  nearbyName: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  nearbyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  nearbyMeta: { fontSize: fontSize.xs, color: colors.muted },
  nearbyRating: { fontSize: fontSize.xs, color: colors.muted },
  nearbyReviews: { fontSize: fontSize.xs, color: colors.muted },
  nearbyPrice: { fontSize: fontSize.xs, color: colors.muted },
  reserveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  reserveBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', padding: spacing.lg },
})
