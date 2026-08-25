import { View, Pressable, StyleSheet } from 'react-native'
import { colors, radius, spacing, shadows } from '../../constants/theme'

export default function Card({ children, onPress, style, padding = true }) {
  const content = (
    <View style={[styles.card, padding && styles.padding, style]}>
      {children}
    </View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        {content}
      </Pressable>
    )
  }
  return content
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    ...shadows.shadowLight,
  },
  padding: {
    padding: spacing.md,
  },
})
