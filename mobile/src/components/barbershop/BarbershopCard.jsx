import { View, Text, Image, StyleSheet } from 'react-native'
import Card from '../ui/Card'
import { colors, fontSize, spacing, radius } from '../../constants/theme'

export default function BarbershopCard({ shop, onPress, distance }) {
  const isPremium = shop?.plan === 'PREMIUM'
  const hasAd = shop?.advertisements?.some(a => a.status === 'ACTIVE')

  return (
    <Card onPress={onPress} style={styles.card} padding={false}>
      {/* Cover image */}
      <View style={styles.imageContainer}>
        {shop?.coverImage ? (
          <Image source={{ uri: shop.coverImage }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Text style={styles.coverEmoji}>✂️</Text>
          </View>
        )}
        {isPremium && hasAd && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>👑 Destacada</Text>
          </View>
        )}
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{shop?.name}</Text>
          {distance !== undefined && (
            <Text style={styles.distance}>📍 {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</Text>
          )}
        </View>
        <Text style={styles.city} numberOfLines={1}>📌 {shop?.city || shop?.address || '—'}</Text>
        <View style={styles.row}>
          <Text style={styles.rating}>⭐ {(shop?.rating || 0).toFixed(1)}</Text>
          <Text style={styles.reviews}>({shop?._count?.reviews || 0} reseñas)</Text>
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { width: 200, marginRight: spacing.md },
  imageContainer: { position: 'relative' },
  cover: { width: '100%', height: 120, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  coverFallback: { backgroundColor: colors.graySoft, alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 36 },
  featuredBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  featuredText: { fontSize: 10, color: colors.white, fontWeight: '700' },
  premiumBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  premiumText: { fontSize: 9, color: colors.accent, fontWeight: '800', letterSpacing: 0.5 },
  info: { padding: spacing.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  name: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, flex: 1 },
  city: { fontSize: fontSize.xs, color: colors.secondary, marginBottom: 4 },
  rating: { fontSize: fontSize.sm, fontWeight: '600', color: colors.black },
  reviews: { fontSize: fontSize.xs, color: colors.secondary },
  distance: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '600' },
})
