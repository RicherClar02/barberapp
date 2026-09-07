import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { View } from 'react-native'
import useTabBarOptions from './useTabBarOptions'
import TabIcon from '../components/ui/TabIcon'

import HomeScreen from '../screens/client/HomeScreen'
import BarbershopDetail from '../screens/client/BarbershopDetail'
import BookingFlow from '../screens/client/BookingFlow'
import ChatbotScreen from '../screens/client/ChatbotScreen'
import MapScreen from '../screens/client/MapScreen'
import MyAppointments from '../screens/client/MyAppointments'
import AppointmentDetail from '../screens/client/AppointmentDetail'
import ProfileNavigator from './ProfileNavigator'

const Tab = createBottomTabNavigator()
const HomeStack = createStackNavigator()
const ApptStack = createStackNavigator()

// La pestaña Mapa queda apagada, no borrada. react-native-maps usa Google Maps,
// que exige una cuenta de facturación activa; sin ella la pantalla revienta al
// montarse. Con una sola barbería el mapa tampoco aporta nada sobre el listado
// de Inicio, así que apagarlo elimina el crash sin depender de Google.
// Para reactivarla: poner esto en true (la pantalla y su import siguen acá).
const MAPA_HABILITADO = false

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStack.Screen name="BarbershopDetail" component={BarbershopDetail} />
      <HomeStack.Screen name="BookingFlow" component={BookingFlow} />
      <HomeStack.Screen name="Chatbot" component={ChatbotScreen} />
    </HomeStack.Navigator>
  )
}

function ApptStackNav() {
  return (
    <ApptStack.Navigator screenOptions={{ headerShown: false }}>
      <ApptStack.Screen name="MyAppointments" component={MyAppointments} />
      <ApptStack.Screen name="AppointmentDetail" component={AppointmentDetail} />
    </ApptStack.Navigator>
  )
}

export default function ClientNavigator() {
  const screenOptions = useTabBarOptions()

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Inicio" component={HomeStackNav}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      {MAPA_HABILITADO && (
        <Tab.Screen name="Mapa" component={MapScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} /> }} />
      )}
      <Tab.Screen name="Mis Citas" component={ApptStackNav}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }} />
      <Tab.Screen name="Perfil" component={ProfileNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} /> }} />
    </Tab.Navigator>
  )
}
