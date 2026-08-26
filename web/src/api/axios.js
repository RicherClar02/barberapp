import axios from 'axios'

// La URL del backend viene de VITE_API_URL, inlineada por Vite en tiempo de
// BUILD (no de ejecución): cambiarla en el hosting exige volver a desplegar.
//
// Debe ser el host pelado, sin /api al final: las llamadas ya incluyen el
// prefijo (api.post('/api/auth/login')).
//
//   VITE_API_URL=https://estilo-backend.onrender.com
//
// En producción no hay fallback a propósito. Antes el valor estaba hardcodeado
// a localhost:3000, así que el build de Vercel apuntaba a la máquina de quien
// abriera el panel y el login fallaba sin dar ninguna pista. Es preferible que
// reviente aquí, con el motivo escrito, que servir un panel roto en silencio.
const RAW_API_URL = import.meta.env.VITE_API_URL

if (!RAW_API_URL && import.meta.env.PROD) {
  throw new Error(
    'VITE_API_URL no está definida en el build de producción. ' +
      'Configúrala en el hosting (Vercel → Settings → Environment Variables) ' +
      'con la URL del backend, por ejemplo https://estilo-backend.onrender.com, ' +
      'y vuelve a desplegar: Vite la inlinea al compilar.'
  )
}

if (!RAW_API_URL) {
  console.warn('[api] VITE_API_URL no definida; usando http://localhost:3000 (solo desarrollo). Créala en web/.env')
}

// Sin barra final, para no acabar con //api/... al concatenar las rutas.
const baseURL = (RAW_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  try {
    const stored = JSON.parse(localStorage.getItem('estilo-auth') || '{}')
    const token = stored?.state?.token
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

// Rutas de autenticación: un 401 aquí significa "credenciales incorrectas",
// no "sesión expirada". Sin esta excepción el interceptor recargaba /login y
// borraba el mensaje de error antes de que el usuario alcanzara a leerlo.
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/verify-reset-code', '/api/auth/reset-password']

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthRequest = AUTH_PATHS.some((path) => url.includes(path))

    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('estilo-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
