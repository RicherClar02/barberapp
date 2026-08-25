import { createStackNavigator } from '@react-navigation/stack'
import ProfileScreen from '../screens/client/ProfileScreen'
import Terms from '../screens/legal/Terms'
import Privacy from '../screens/legal/Privacy'
import DeleteAccount from '../screens/legal/DeleteAccount'

const Stack = createStackNavigator()

// Perfil + pantallas legales. Lo usan tanto clientes como barberos: las
// tiendas exigen que cualquier usuario logueado pueda leer los términos y
// eliminar su cuenta desde dentro de la app, sin importar su rol.
export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="Terms" component={Terms} />
      <Stack.Screen name="Privacy" component={Privacy} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccount} />
    </Stack.Navigator>
  )
}
