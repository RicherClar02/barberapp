import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Text, View } from 'react-native'
import useTabBarOptions from './useTabBarOptions'

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

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
  )
}

export default function ClientNavigator() {
  const screenOptions = useTabBarOptions()

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Inicio" component={HomeStackNav}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Mapa" component={MapScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} /> }} />
      <Tab.Screen name="Mis Citas" component={ApptStackNav}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }} />
      <Tab.Screen name="Perfil" component={ProfileNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  )
}
