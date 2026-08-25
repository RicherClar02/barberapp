import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'

const variants = {
  primary: { bg: colors.primary, text: colors.white, border: colors.primary },
  secondary: { bg: colors.secondary, text: colors.white, border: colors.secondary },
  outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  danger: { bg: colors.error, text: colors.white, border: colors.error },
  ghost: { bg: 'transparent', text: colors.secondary, border: 'transparent' },
  accent: { bg: colors.accent, text: colors.white, border: colors.accent },
}

const sizes = {
  sm: { px: spacing.md, py: spacing.sm - 2, fs: fontSize.sm, h: 34 },
  md: { px: spacing.lg, py: spacing.sm + 2, fs: fontSize.md, h: 44 },
  lg: { px: spacing.xl, py: spacing.md, fs: fontSize.lg, h: 54 },
}

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) {
  const v = variants[variant] || variants.primary
  const s = sizes[size] || sizes.md

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          height: s.h,
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant === 'primary' && shadows.shadowLight,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[styles.text, { color: v.text, fontSize: s.fs }]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
})
