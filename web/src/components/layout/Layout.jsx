import Sidebar from './Sidebar'
import Header from './Header'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/owner/dashboard': 'Mi Dashboard',
  '/owner/barbers': 'Barberos',
  '/owner/services': 'Servicios',
  '/owner/appointments': 'Citas / Agenda',
  '/owner/offers': 'Ofertas',
  '/owner/finances': 'Finanzas',
  '/owner/advertising': 'Publicidad',
  '/owner/settings': 'Configuración',
  '/barber/agenda': 'Mi Agenda',
  '/barber/appointments': 'Mis Citas',
  '/barber/earnings': 'Mis Ganancias',
  '/barber/profile': 'Mi Perfil',
  '/superadmin/dashboard': 'Dashboard General',
  '/superadmin/barbershops': 'Barberías',
  '/superadmin/users': 'Usuarios',
  '/superadmin/subscriptions': 'Suscripciones',
  '/superadmin/ads': 'Publicidad',
  '/superadmin/analytics': 'Analytics Plataforma',
  '/profile': 'Mi Perfil',
}

export default function Layout({ children }) {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'BarberApp'

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
