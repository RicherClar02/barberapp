import { View, Text, StyleSheet } from 'react-native'
import Button from './Button'
import { colors, fontSize, spacing } from '../../constants/theme'

export default function EmptyState({ icon = '✂️', title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button onPress={onAction} style={{ marginTop: spacing.lg }}>
          {actionLabel}
        </Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: { fontSize: 56, marginBottom: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.secondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },
})
