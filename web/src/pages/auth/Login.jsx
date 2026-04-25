import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'El email es requerido'
    if (!form.password) e.password = 'La contraseña es requerida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', form)
      login(data.user, data.token)
      toast.success(`Bienvenido, ${data.user.name}`)
      if (data.user.role === 'ADMIN') navigate('/superadmin/dashboard')
      else if (data.user.role === 'OWNER') navigate('/owner/dashboard')
      else navigate('/barber/agenda')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar sesión')
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
          <h1 className="text-3xl font-bold text-primary font-heading">BarberApp</h1>
          <p className="text-secondary mt-1 text-sm">Panel de administración</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-soft p-8">
          <h2 className="text-xl font-semibold text-black-soft font-heading mb-6">Iniciar sesión</h2>
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
          BarberApp v1.0.0 — Proyecto de Grado 2025
        </p>
      </div>
    </div>
  )
}
