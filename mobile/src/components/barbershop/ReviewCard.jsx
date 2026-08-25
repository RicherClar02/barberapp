import { View, Text, StyleSheet } from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import { timeAgo } from '../../utils/formatters'

export default function ReviewCard({ review }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{review?.client?.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.name}>{review?.client?.name || 'Cliente'}</Text>
          <Text style={styles.time}>{timeAgo(review?.createdAt)}</Text>
        </View>
        <View style={styles.stars}>
          {[1,2,3,4,5].map(s => (
            <Text key={s} style={{ fontSize: 12 }}>{s <= review?.rating ? '⭐' : '☆'}</Text>
          ))}
        </View>
      </View>
      {review?.comment && <Text style={styles.comment}>"{review.comment}"</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  meta: { flex: 1 },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  time: { fontSize: fontSize.xs, color: colors.secondary },
  stars: { flexDirection: 'row' },
  comment: { fontSize: fontSize.sm, color: colors.secondary, fontStyle: 'italic', lineHeight: 20 },
})
