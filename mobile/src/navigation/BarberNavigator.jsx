import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import useTabBarOptions from './useTabBarOptions'

import AgendaScreen from '../screens/barber/AgendaScreen'
import CalendarScreen from '../screens/barber/CalendarScreen'
import EarningsScreen from '../screens/barber/EarningsScreen'
import MyCardScreen from '../screens/barber/MyCardScreen'
import ProfileNavigator from './ProfileNavigator'

const Tab = createBottomTabNavigator()

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
}

export default function BarberNavigator() {
  const screenOptions = useTabBarOptions()

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Mi Agenda" component={AgendaScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }} />
      <Tab.Screen name="Calendario" component={CalendarScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🗓️" focused={focused} /> }} />
      <Tab.Screen name="Ganancias" component={EarningsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focused={focused} /> }} />
      <Tab.Screen name="Mi Tarjeta" component={MyCardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🪪" focused={focused} /> }} />
      <Tab.Screen name="Perfil" component={ProfileNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  )
}
