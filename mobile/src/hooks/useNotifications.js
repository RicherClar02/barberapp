import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Toast from 'react-native-toast-message'
import api from '../api/axios'
import useAuthStore from '../store/authStore'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert quedó deprecado en expo-notifications 0.29 y ya no se
    // lee en la 0.32 (SDK 54): se partió en dos decisiones separadas, el
    // banner que aparece arriba y la entrada que queda en el centro de
    // notificaciones. Mientras se mandaba el campo viejo, con la app abierta
    // no se mostraba nada.
    shouldShowBanner: true,
    shouldShowList: true,
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
      // Cada suscripción se cierra con su propio .remove(). La función suelta
      // Notifications.removeNotificationSubscription ya no existe en la 0.32, y
      // al cerrar sesión este cleanup corría igual: la llamada reventaba con
      // "is not a function" y se llevaba puesta la app entera.
      //
      // El optional chaining no es decorativo: si el efecto se desmonta antes
      // de que los listeners queden asignados (logout inmediato, o el registro
      // de push todavía en vuelo), los refs siguen en undefined y .remove()
      // sobre undefined vuelve a tirar el mismo crash.
      notifListener.current?.remove()
      responseListener.current?.remove()
      notifListener.current = undefined
      responseListener.current = undefined
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
