import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import useTabBarOptions from './useTabBarOptions'
import TabIcon from '../components/ui/TabIcon'

import AgendaScreen from '../screens/barber/AgendaScreen'
import CalendarScreen from '../screens/barber/CalendarScreen'
import EarningsScreen from '../screens/barber/EarningsScreen'
import MyCardScreen from '../screens/barber/MyCardScreen'
import ProfileNavigator from './ProfileNavigator'

const Tab = createBottomTabNavigator()

export default function BarberNavigator() {
  const screenOptions = useTabBarOptions()

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Mi Agenda" component={AgendaScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} /> }} />
      <Tab.Screen name="Calendario" component={CalendarScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }} />
      <Tab.Screen name="Ganancias" component={EarningsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="dollar-sign" focused={focused} /> }} />
      <Tab.Screen name="Mi Tarjeta" component={MyCardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="credit-card" focused={focused} /> }} />
      <Tab.Screen name="Perfil" component={ProfileNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} /> }} />
    </Tab.Navigator>
  )
}
