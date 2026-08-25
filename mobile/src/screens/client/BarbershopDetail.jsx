import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, Dimensions, StatusBar, Platform,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'
import { formatCurrency, timeAgo } from '../../utils/formatters'
import ServiceCard from '../../components/barbershop/ServiceCard'
import ReviewCard from '../../components/barbershop/ReviewCard'

const { width } = Dimensions.get('window')
const COVER_H = 240
const TABS = ['Servicios', 'Barberos', 'Galería', 'Reseñas']

export default function BarbershopDetail({ route, navigation }) {
  const { shopId, shop: initShop } = route.params || {}
  const [activeTab, setActiveTab] = useState(0)

  const { data: shopData } = useQuery({
    queryKey: ['barbershop', shopId],
    queryFn: () => api.get(`/api/barbershops/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })
  const { data: servicesData } = useQuery({
    queryKey: ['shop-services', shopId],
    queryFn: () => api.get(`/api/services/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })
  const { data: barbersData } = useQuery({
    queryKey: ['shop-barbers', shopId],
    queryFn: () => api.get(`/api/barbers/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })
  const { data: reviewsData } = useQuery({
    queryKey: ['shop-reviews', shopId],
    queryFn: () => api.get(`/api/reviews/barbershop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const shop = shopData?.barbershop || shopData || initShop || {}
  const services = servicesData?.services || servicesData || []
  const barbers = barbersData?.barbers || barbersData || []
  const reviews = reviewsData?.reviews || reviewsData || []

  const stars = (rating) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Text key={i} style={{ color: i < Math.round(rating || 0) ? colors.accent : colors.graySoft, fontSize: 14 }}>★</Text>
    ))

  // Abrir mapas nativos con deep link según plataforma, con fallback web
  const lat = shop.latitude ?? shop.lat
  const lng = shop.longitude ?? shop.lng
  const openDirections = async () => {
    const nativeUrl = Platform.select({
      ios: `https://maps.apple.com/?daddr=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
    })
    const webUrl = `https://www.google.com/maps?q=${lat},${lng}`
    try {
      const supported = nativeUrl && await Linking.canOpenURL(nativeUrl)
      await Linking.openURL(supported ? nativeUrl : webUrl)
    } catch {
      Linking.openURL(webUrl)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Cover */}
        <View style={styles.cover}>
          {shop.coverImage ? (
            <Image source={{ uri: shop.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.coverFallback]}>
              <Text style={{ fontSize: 64 }}>✂️</Text>
            </View>
          )}
          <View style={styles.coverOverlay} />

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.coverFooter}>
            {shop.plan === 'PREMIUM' && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>★ PREMIUM</Text>
              </View>
            )}
            <Text style={styles.shopName}>{shop.name}</Text>
            <Text style={styles.shopCity}>{shop.city}</Text>
          </View>
        </View>

        {/* Tabs (sticky) */}
        <View style={styles.tabsBar}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(i)}
              style={[styles.tab, activeTab === i && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>{stars(shop.rating)}</View>
            <Text style={styles.ratingNum}>{(shop.rating || 0).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({reviews.length} reseñas)</Text>
          </View>

          {shop.address && (
            <Text style={styles.address}>📍 {shop.address}, {shop.city}</Text>
          )}

          <View style={styles.contactBtns}>
            {shop.phone && (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`tel:${shop.phone}`)}
              >
                <Text style={styles.contactBtnIcon}>📞</Text>
                <Text style={styles.contactBtnText}>Llamar</Text>
              </TouchableOpacity>
            )}
            {shop.whatsapp && (
              <TouchableOpacity
                style={[styles.contactBtn, styles.contactBtnWa]}
                onPress={() => Linking.openURL(`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`)}
              >
                <Text style={styles.contactBtnIcon}>💬</Text>
                <Text style={[styles.contactBtnText, styles.contactBtnWaText]}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {lat != null && lng != null && (
              <TouchableOpacity style={styles.contactBtn} onPress={openDirections}>
                <Text style={styles.contactBtnIcon}>📍</Text>
                <Text style={styles.contactBtnText}>Cómo llegar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {/* Servicios */}
          {activeTab === 0 && (
            services.length === 0
              ? <Text style={styles.emptyText}>No hay servicios disponibles</Text>
              : services.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  onBook={() =>
                    navigation.navigate('BookingFlow', { shopId, shop, serviceId: s.id, service: s })
                  }
                />
              ))
          )}

          {/* Barberos */}
          {activeTab === 1 && (
            barbers.length === 0
              ? <Text style={styles.emptyText}>No hay barberos disponibles</Text>
              : (
                <View style={styles.barbersGrid}>
                  {barbers.map(b => (
                    <View key={b.id} style={styles.barberCard}>
                      {b.avatar
                        ? <Image source={{ uri: b.avatar }} style={styles.barberAvatar} />
                        : (
                          <View style={[styles.barberAvatar, styles.barberAvatarFallback]}>
                            <Text style={{ fontSize: 28 }}>✂️</Text>
                          </View>
                        )
                      }
                      <Text style={styles.barberName} numberOfLines={1}>{b.name}</Text>
                      <Text style={styles.barberSub} numberOfLines={1}>{b.specialty || 'Barbero'}</Text>
                      <Text style={styles.barberRating}>⭐ {(b.rating || 0).toFixed(1)}</Text>
                    </View>
                  ))}
                </View>
              )
          )}

          {/* Galería */}
          {activeTab === 2 && (
            shop.gallery?.length > 0
              ? (
                <View style={styles.gallery}>
                  {shop.gallery.map((img, i) => (
                    <Image key={i} source={{ uri: img }} style={styles.galleryImg} />
                  ))}
                </View>
              )
              : <Text style={styles.emptyText}>Sin fotos en la galería</Text>
          )}

          {/* Reseñas */}
          {activeTab === 3 && (
            <View>
              <View style={styles.ratingBig}>
                <Text style={styles.ratingBigNum}>{(shop.rating || 0).toFixed(1)}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>{stars(shop.rating)}</View>
                <Text style={styles.ratingBigSub}>{reviews.length} reseñas</Text>
              </View>
              {reviews.length > 0 && (
                <View style={styles.ratingBars}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length
                    const pct = reviews.length > 0 ? count / reviews.length : 0
                    return (
                      <View key={star} style={styles.ratingBarRow}>
                        <Text style={styles.ratingBarLabel}>{'★'.repeat(star)}</Text>
                        <View style={styles.ratingBarTrack}>
                          <View style={[styles.ratingBarFill, { width: `${pct * 100}%` }]} />
                        </View>
                        <Text style={styles.ratingBarCount}>{count}</Text>
                      </View>
                    )
                  })}
                </View>
              )}
              {reviews.length === 0
                ? <Text style={styles.emptyText}>Sé el primero en calificar</Text>
                : reviews.map(r => <ReviewCard key={r.id} review={r} />)
              }
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Botón flotante chatbot */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => navigation.navigate('Chatbot', { shopId, shopName: shop.name })}
        activeOpacity={0.85}
      >
        <Text style={styles.chatFabIcon}>💬</Text>
        <Text style={styles.chatFabText}>Chat IA</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  cover: { height: COVER_H, justifyContent: 'flex-end' },
  coverFallback: { backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(74,44,10,0.55)' },
  backBtn: { position: 'absolute', top: 48, left: spacing.md, padding: spacing.sm },
  backBtnText: { color: colors.white, fontSize: 32, fontWeight: '700', lineHeight: 34 },
  coverFooter: { padding: spacing.md },
  premiumBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.full, marginBottom: spacing.xs,
  },
  premiumText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '800' },
  shopName: { color: colors.white, fontSize: fontSize.xl, fontWeight: '800' },
  shopCity: { color: colors.white + 'CC', fontSize: fontSize.sm },
  tabsBar: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.graySoft,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.secondary },
  tabTextActive: { color: colors.primary, fontWeight: '800' },
  infoSection: { backgroundColor: colors.white, padding: spacing.lg, marginBottom: spacing.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  starsRow: { flexDirection: 'row' },
  ratingNum: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  reviewCount: { fontSize: fontSize.sm, color: colors.secondary },
  address: { fontSize: fontSize.sm, color: colors.secondary, marginBottom: spacing.md },
  contactBtns: { flexDirection: 'row', gap: spacing.sm },
  contactBtn: {
    flex: 1, alignItems: 'center', backgroundColor: colors.cream,
    borderRadius: radius.md, padding: spacing.sm,
  },
  contactBtnIcon: { fontSize: 20, marginBottom: 2 },
  contactBtnText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  contactBtnWa: { backgroundColor: '#E8F8EF' },
  contactBtnWaText: { color: '#25D366' },
  tabContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  emptyText: { textAlign: 'center', color: colors.secondary, fontSize: fontSize.sm, padding: spacing.xl },
  barbersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  barberCard: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', ...shadows.shadowLight,
  },
  barberAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: spacing.sm },
  barberAvatarFallback: { backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  barberName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  barberSub: { fontSize: fontSize.xs, color: colors.secondary, textAlign: 'center' },
  barberRating: { fontSize: fontSize.xs, marginTop: 2 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  galleryImg: {
    width: (width - spacing.lg * 2) / 3 - 2,
    height: (width - spacing.lg * 2) / 3 - 2,
  },
  ratingBig: {
    alignItems: 'center', padding: spacing.lg,
    backgroundColor: colors.white, borderRadius: radius.md,
    marginBottom: spacing.md, ...shadows.shadowLight,
  },
  ratingBigNum: { fontSize: 56, fontWeight: '900', color: colors.primary },
  ratingBigSub: { fontSize: fontSize.sm, color: colors.secondary, marginTop: spacing.xs },
  ratingBars: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md, ...shadows.shadowLight,
  },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  ratingBarLabel: { fontSize: fontSize.xs, color: colors.accent, width: 60 },
  ratingBarTrack: { flex: 1, height: 6, backgroundColor: colors.graySoft, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  ratingBarCount: { fontSize: fontSize.xs, color: colors.secondary, width: 20, textAlign: 'right' },
  chatFab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    ...shadows.shadowMedium,
  },
  chatFabIcon: { fontSize: 18 },
  chatFabText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
})
