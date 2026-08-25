import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { colors, fontSize } from '../constants/theme'

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.graySoft,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
      }}
    >
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
