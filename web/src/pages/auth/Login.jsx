import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { roleHome } from '../../utils/roleHome'

// Mensaje según el código HTTP. Manda este texto, no el del backend: el
// usuario ve siempre la misma frase para el mismo problema. Para códigos
// fuera de esta tabla se usa el 'message' del backend.
const ERROR_BY_STATUS = {
  400: 'Revisa el correo y la contraseña.',
  401: 'Correo o contraseña incorrectos',
  403: 'Tu cuenta no tiene acceso a este panel',
  423: 'Cuenta temporalmente bloqueada. Intenta en 30 minutos',
  429: 'Demasiados intentos. Espera unos minutos',
}

export default function Login() {
  useDocumentTitle('Iniciar sesión')
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'El email es requerido'
    if (!form.password) e.password = 'La contraseña es requerida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Un solo punto para mostrar el fallo: banner fijo dentro del formulario
  // (no se pierde como el toast) + toast para que se note al instante.
  const fail = (message) => {
    setFormError(message)
    toast.error(message)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', form)

      // 200 pero sin token: BARBER/OWNER aún sin aprobar por un admin
      if (data.pendingApproval || !data.token) {
        fail(data.message || 'Tu cuenta está pendiente de aprobación por un administrador.')
        return
      }

      const home = roleHome(data.user.role)
      if (!home) {
        fail('Este panel es solo para administradores, dueños y barberos. Los clientes usan la app móvil.')
        return
      }

      login(data.user, data.token)
      toast.success(`Bienvenido, ${data.user.name}`)
      navigate(home, { replace: true })
    } catch (err) {
      const status = err.response?.status
      const message =
        ERROR_BY_STATUS[status] ||
        err.response?.data?.message ||
        (err.response ? 'Error al iniciar sesión' : 'No se pudo conectar con el servidor')
      fail(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-accent text-3xl">✂</span>
          </div>
          <h1 className="text-3xl font-bold text-primary font-heading">ESTILO</h1>
          <p className="text-secondary mt-1 text-sm">Panel de administración</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-soft p-8">
          <h2 className="text-xl font-semibold text-black-soft font-heading mb-6">Iniciar sesión</h2>
          {formError && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              icon={<Mail size={16} />}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={16} />}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              error={errors.password}
            />
            <div className="flex justify-end">
              <button type="button" className="text-xs text-accent hover:text-secondary transition-colors cursor-pointer">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-secondary mt-6">
          ESTILO v1.0.0
        </p>
      </div>
    </div>
  )
}
