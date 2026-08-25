import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Scissors, Users, CreditCard, Megaphone,
  BarChart2, Store, Calendar, DollarSign, Settings, Tag,
  ClipboardList, UserCheck, LogOut, ChevronLeft, ChevronRight, IdCard,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { useState } from 'react'
import { formatCurrency } from '../../utils/formatters'

const adminMenu = [
  { to: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Dashboard General' },
  { to: '/superadmin/barbershops', icon: Store, label: 'Barberías' },
  { to: '/superadmin/users', icon: Users, label: 'Usuarios' },
  { to: '/superadmin/subscriptions', icon: CreditCard, label: 'Suscripciones' },
  { to: '/superadmin/ads', icon: Megaphone, label: 'Publicidad' },
  { to: '/superadmin/analytics', icon: BarChart2, label: 'Analytics Plataforma' },
]

const ownerMenu = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/barbers', icon: Users, label: 'Barberos' },
  { to: '/owner/services', icon: Scissors, label: 'Servicios' },
  { to: '/owner/appointments', icon: ClipboardList, label: 'Agenda' },
  { to: '/owner/offers', icon: Tag, label: 'Ofertas' },
  { to: '/owner/finances', icon: DollarSign, label: 'Finanzas' },
  { to: '/owner/advertising', icon: Megaphone, label: 'Publicidad' },
  { to: '/owner/settings', icon: Settings, label: 'Configuración' },
]

const barberMenu = [
  { to: '/barber/agenda', icon: Scissors, label: 'Mi Agenda' },
  { to: '/barber/calendar', icon: Calendar, label: 'Mi Calendario' },
  { to: '/barber/earnings', icon: DollarSign, label: 'Mis Ganancias' },
  { to: '/barber/appointments', icon: ClipboardList, label: 'Mis Citas' },
  { to: '/barber/card', icon: IdCard, label: 'Mi Tarjeta' },
  { to: '/profile', icon: UserCheck, label: 'Mi Perfil' },
]

const PLAN_BADGE = {
  PREMIUM: 'bg-[#FDF0E0] text-[#8B5E0A]',
  STANDARD: 'bg-cream text-primary',
  BASIC: 'bg-gray-100 text-gray-500',
}

function BarberDaySummary({ collapsed }) {
  const { data } = useQuery({
    queryKey: ['barber-sidebar-today'],
    queryFn: async () => {
      const p = await api.get('/api/barbers/my').then(r => r.data)
      const id = p?.barber?.id || p?.id
      if (!id) return null
      return api.get(`/api/barber-card/${id}`).then(r => r.data)
    },
    refetchInterval: 60000,
  })
  const today = data?.today || {}
  if (collapsed || !data) return null
  return (
    <div className="mx-3 mb-3 bg-white/10 rounded-xl p-3 text-xs text-white/80">
      <p className="font-semibold text-white/50 mb-1.5 uppercase tracking-wider text-[10px]">Hoy</p>
      <p className="flex items-center gap-1.5">✂️ <span>{today.completed || 0}/{today.total || 0} cortes</span></p>
      <p className="text-accent font-semibold mt-1">{formatCurrency(today.earnings || 0)}</p>
    </div>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const menu = user?.role === 'ADMIN' ? adminMenu : user?.role === 'OWNER' ? ownerMenu : barberMenu

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const planKey = user?.barbershop?.plan || user?.plan
  const planLabel = planKey === 'PREMIUM' ? 'Premium 👑' : planKey === 'STANDARD' ? 'Estándar' : planKey === 'BASIC' ? 'Básico' : null

  return (
    <aside className={`bg-primary flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} min-h-screen relative flex-shrink-0`}>
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 bg-accent text-white rounded-full p-1 shadow-md z-10 cursor-pointer hover:bg-secondary transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-6 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <span className="text-accent text-2xl">✂️</span>
        {!collapsed && (
          <span className="text-white font-bold text-lg font-heading tracking-wide">ESTILO</span>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {menu.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative
              ${isActive
                ? 'bg-white/15 text-white border-l-[3px] border-accent'
                : 'text-white/70 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium font-body">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Barber day summary */}
      {user?.role === 'BARBER' && <BarberDaySummary collapsed={collapsed} />}

      {/* User section */}
      <div className="border-t border-white/10 p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
            {user?.avatar
              ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              : user?.name?.[0]?.toUpperCase() || 'U'
            }
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-white text-sm font-semibold truncate font-body">{user?.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-white/50 text-xs truncate">{user?.role}</p>
                {planLabel && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PLAN_BADGE[planKey] || 'bg-gray-100 text-gray-500'}`}>
                    {planLabel}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer text-sm font-body ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
