import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

// NUNCA usar 'localhost': desde el celular apuntaría al propio teléfono.
//
// EXPO_PUBLIC_* se inlinea en tiempo de BUILD, no de ejecución: en un binario de
// EAS el valor queda congelado al compilar, así que cambiarlo exige rebuild. El
// archivo mobile/.env NO viaja al build de EAS — la variable se declara en
// eas.json (env del perfil) o en los secrets de EAS.
const getApiUrl = () => {
  // 1. Variable de entorno explícita (mobile/.env en dev, eas.json en release).
  //    Manda sobre todo lo demás.
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }

  // Sin variable y fuera de desarrollo no hay forma de adivinar el backend: los
  // fallbacks de abajo son direcciones de red local que en un celular cualquiera
  // no resuelven a nada. Antes se caía a 10.0.2.2:3000 y la app quedaba sin
  // backend sin decir por qué. Mismo criterio que web/src/api/axios.js: es
  // preferible reventar acá, con el motivo escrito, que publicar una app rota
  // en silencio.
  if (!__DEV__) {
    throw new Error(
      'EXPO_PUBLIC_API_URL no está definida en este build de producción. ' +
        'Declárala en eas.json, dentro de build.<perfil>.env, con la URL del ' +
        'backend (por ejemplo https://estilo-backend.onrender.com) y volvé a ' +
        'compilar: Expo la inlinea al construir, no se lee en tiempo de ejecución.'
    )
  }

  // 2. Host desde el que se sirve Expo Go: es el PC de desarrollo, o sea el
  //    mismo donde corre el backend. Funciona en iPhone/Android físico por LAN
  //    y sigue funcionando aunque el router cambie la IP del PC.
  const debuggerHost =
    Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost

  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]
    return `http://${host}:3000`
  }

  // 3. Último recurso: emulador Android (10.0.2.2 = el host desde el emulador).
  return 'http://10.0.2.2:3000'
}

const API_URL = getApiUrl()
console.log('[Estilo] API URL:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('estilo_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('estilo_token')
      await SecureStore.deleteItemAsync('estilo_user')
    }
    return Promise.reject(error)
  }
)

export default api
