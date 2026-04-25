import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Scissors, Users, CreditCard, Megaphone,
  BarChart2, Store, Calendar, DollarSign, Settings, Tag,
  ClipboardList, UserCheck, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { useState } from 'react'

const adminMenu = [
  { to: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Dashboard General' },
  { to: '/superadmin/barbershops', icon: Store, label: 'Barberías' },
  { to: '/superadmin/users', icon: Users, label: 'Usuarios' },
  { to: '/superadmin/subscriptions', icon: CreditCard, label: 'Suscripciones' },
  { to: '/superadmin/ads', icon: Megaphone, label: 'Publicidad' },
  { to: '/superadmin/analytics', icon: BarChart2, label: 'Analytics Plataforma' },
]

const ownerMenu = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Mi Dashboard' },
  { to: '/owner/barbers', icon: Users, label: 'Barberos' },
  { to: '/owner/services', icon: Scissors, label: 'Servicios' },
  { to: '/owner/appointments', icon: ClipboardList, label: 'Citas / Agenda' },
  { to: '/owner/offers', icon: Tag, label: 'Ofertas' },
  { to: '/owner/finances', icon: DollarSign, label: 'Finanzas' },
  { to: '/owner/advertising', icon: Megaphone, label: 'Publicidad' },
  { to: '/owner/settings', icon: Settings, label: 'Configuración' },
]

const barberMenu = [
  { to: '/barber/agenda', icon: Calendar, label: 'Mi Agenda' },
  { to: '/barber/appointments', icon: ClipboardList, label: 'Mis Citas' },
  { to: '/barber/earnings', icon: DollarSign, label: 'Mis Ganancias' },
  { to: '/barber/profile', icon: UserCheck, label: 'Mi Perfil' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const menu = user?.role === 'ADMIN' ? adminMenu : user?.role === 'OWNER' ? ownerMenu : barberMenu

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={`bg-primary flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} min-h-screen relative`}>
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 bg-accent text-white rounded-full p-1 shadow-md z-10 cursor-pointer hover:bg-secondary transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-secondary/30">
        <span className="text-accent text-2xl flex-shrink-0">✂</span>
        {!collapsed && (
          <span className="text-white font-bold text-lg font-heading tracking-wide">BarberApp</span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {menu.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
              ${isActive ? 'bg-accent text-white' : 'text-cream/80 hover:bg-secondary/40 hover:text-white'}`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-secondary/30 p-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-cream/60 text-xs truncate">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-cream/70 hover:bg-red-600/20 hover:text-red-300 transition-colors cursor-pointer text-sm"
        >
          <LogOut size={16} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
