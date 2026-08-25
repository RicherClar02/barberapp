import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import Button from '../components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const goHome = () => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (user?.role === 'ADMIN') navigate('/superadmin/dashboard')
    else if (user?.role === 'OWNER') navigate('/owner/dashboard')
    else navigate('/barber/agenda')
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center text-center px-6">
      <span className="text-8xl mb-6">✂️</span>
      <h1 className="text-4xl font-bold text-primary font-heading mb-2">404</h1>
      <p className="text-xl font-semibold text-secondary mb-2">Esta página no existe</p>
      <p className="text-secondary mb-8 max-w-sm">
        La página que buscas no se encontró o fue movida.
      </p>
      <Button onClick={goHome}>Volver al inicio</Button>
    </div>
  )
}
