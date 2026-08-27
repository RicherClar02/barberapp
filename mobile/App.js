import { useCallback, useEffect, useRef } from 'react'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import Toast from 'react-native-toast-message'
import RootNavigator from './src/navigation'
import useNotifications from './src/hooks/useNotifications'

// Se retiene el splash nativo para que la primera pantalla ya se pinte con las
// fuentes definitivas, en lugar de mostrar la del sistema y saltar al aplicarlas.
// Si la llamada falla (por ejemplo, el splash ya se ocultó solo) no es motivo
// para tumbar la app: se registra y se sigue.
SplashScreen.preventAutoHideAsync().catch(() => {})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function AppInner() {
  const navigationRef = useRef(null)
  useNotifications(navigationRef)
  return <RootNavigator navigationRef={navigationRef} />
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  })

  // Un fallo al descargar las fuentes no puede dejar la app en blanco: se
  // arranca igual y React Native cae a la fuente del sistema. `fontError` ya
  // viene resuelto por useFonts, así que basta con no seguir esperando.
  const listo = fontsLoaded || fontError

  useEffect(() => {
    if (fontError) {
      console.warn('[fonts] No se pudieron cargar las fuentes, se usa la del sistema:', fontError)
    }
  }, [fontError])

  // onLayout en vez de un efecto: garantiza que el primer frame ya esté pintado
  // cuando se retira el splash, evitando el parpadeo en blanco intermedio.
  const onLayoutRootView = useCallback(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {})
  }, [listo])

  if (!listo) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <AppInner />
          <Toast />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
