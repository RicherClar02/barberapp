import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize } from '../constants/theme'

// Alto del contenido de la barra (icono + etiqueta), SIN la zona del sistema.
const TAB_BAR_CONTENT_HEIGHT = 64
const TAB_BAR_BOTTOM_PADDING = 8

// Opciones compartidas por ClientNavigator y BarberNavigator. Estaban
// duplicadas literalmente en los dos archivos, así que un arreglo en uno no
// llegaba al otro.
//
// app.json tiene android.edgeToEdgeEnabled: true (obligatorio desde Android
// 15), o sea que la app dibuja por debajo de la barra de navegación del
// sistema. Con `height: 64` y `paddingBottom: 8` fijos, esos 64px incluían la
// franja que ocupa el sistema y la barra quedaba tapada — peor todavía en
// teléfonos con navegación por gestos, donde esa franja es más alta.
//
// react-navigation v7 ya suma los insets solo, pero únicamente cuando NO se le
// fija un `height`; al fijarlo se pisa ese cálculo. Por eso el inset se suma
// acá explícitamente en vez de con un número mayor: `insets.bottom` vale 0 en
// un teléfono con botones físicos y ~24-48px con gestos, así que un margen fijo
// que sirva en un equipo sobra o falta en el resto.
export default function useTabBarOptions() {
  const insets = useSafeAreaInsets()

  return {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.white,
      borderTopColor: colors.graySoft,
      borderTopWidth: 1,
      height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
      paddingBottom: TAB_BAR_BOTTOM_PADDING + insets.bottom,
      paddingTop: 4,
    },
    tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: '600' },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.secondary,
  }
}
