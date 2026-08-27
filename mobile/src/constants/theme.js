export const colors = {
  primary: '#4A2C0A',
  secondary: '#8B5E3C',
  accent: '#C49A6C',
  cream: '#F5EFE6',
  white: '#FFFFFF',
  graySoft: '#E8E0D8',
  muted: '#9E8670',
  border: 'rgba(74, 44, 10, 0.1)',
  error: '#C0392B',
  destructive: '#EF4444',
  success: '#27AE60',
  whatsapp: '#25D366',
  black: '#1A1A1A',
  textSecondary: '#9E8670',
  background: '#F5EFE6',
}

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
}

// Nombres de familia tal como los registra useFonts en App.js. Se exportan
// aparte para poder componer estilos puntuales sin repetir el literal.
export const fontFamily = {
  heading: 'Poppins_600SemiBold',
  headingBold: 'Poppins_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
}

// Estilos de texto nombrados. Poppins para títulos, Inter para cuerpo.
// Los lineHeight son absolutos porque React Native no acepta múltiplos.
//
// Si las fuentes no cargan, App.js arranca igual y RN cae a la fuente del
// sistema: se pierde la familia, pero el tamaño y el interlineado se respetan,
// así que ninguna pantalla se descuadra.
export const typography = {
  h1: {
    fontFamily: 'Poppins_700Bold',
    fontSize: fontSize.xxxl,
    lineHeight: 44,
  },
  h2: {
    fontFamily: 'Poppins_700Bold',
    fontSize: fontSize.xxl,
    lineHeight: 36,
  },
  h3: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: fontSize.xl,
    lineHeight: 30,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
}

export const shadows = {
  shadowLight: {
    shadowColor: '#4A2C0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  shadowMedium: {
    shadowColor: '#4A2C0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
  },
}

export const STATUS_COLORS = {
  PENDING: { bg: '#FEF9C3', text: '#92400E' },
  CONFIRMED: { bg: '#DBEAFE', text: '#1E40AF' },
  IN_PROGRESS: { bg: '#EDE9FE', text: '#6D28D9' },
  COMPLETED: { bg: '#DCFCE7', text: '#166534' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
  NO_SHOW: { bg: '#F3F4F6', text: '#6B7280' },
}
