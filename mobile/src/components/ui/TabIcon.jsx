import Feather from '@expo/vector-icons/Feather'
import { colors } from '../../constants/theme'

// Ícono de la barra de pestañas. Recibe el NOMBRE de un ícono Feather
// ("home", "calendar", ...), nunca un emoji.
//
// Estaba duplicado, idéntico, en ClientNavigator y BarberNavigator: un arreglo
// en uno no llegaba al otro. Mismo criterio que useTabBarOptions.
//
// El estado activo/inactivo se pinta con los mismos tokens que ya usan las
// etiquetas de la barra (tabBarActiveTintColor / tabBarInactiveTintColor en
// useTabBarOptions), así que el ícono y su etiqueta cambian juntos.
export default function TabIcon({ name, focused }) {
  return (
    <Feather
      name={name}
      size={24}
      color={focused ? colors.primary : colors.secondary}
    />
  )
}
