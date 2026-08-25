import { View, Text, StyleSheet } from 'react-native'
import { STATUS_COLORS } from '../../constants/theme'
import { getStatusLabel } from '../../utils/formatters'
import { fontSize, radius, spacing } from '../../constants/theme'

export default function Badge({ status }) {
  const sc = STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#6B7280' }
  return (
    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
      <Text style={[styles.text, { color: sc.text }]}>{getStatusLabel(status)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
})
