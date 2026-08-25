import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000',
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
