import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Toast from 'react-native-toast-message'
import api from '../api/axios'
import useAuthStore from '../store/authStore'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export default function useNotifications(navigationRef) {
  const { isAuthenticated } = useAuthStore()
  const notifListener = useRef()
  const responseListener = useRef()

  useEffect(() => {
    if (!isAuthenticated) return

    registerForPush()

    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      const { title, body } = notification.request.content
      Toast.show({
        type: 'info',
        text1: title || 'ESTILO',
        text2: body,
        position: 'top',
        visibilityTime: 4000,
      })
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data || {}
      if (data.type === 'APPOINTMENT_REMINDER' || data.type === 'APPOINTMENT_CONFIRMED') {
        navigationRef?.current?.navigate('Mis Citas')
      }
    })

    return () => {
      Notifications.removeNotificationSubscription(notifListener.current)
      Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [isAuthenticated])
}

async function registerForPush() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C49A6C',
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    await api.put('/api/notifications/preferences', { pushToken: tokenData.data })
  } catch {
    // Token registration is best-effort
  }
}
