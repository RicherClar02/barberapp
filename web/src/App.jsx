import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import useAuthStore from './store/authStore'
import { roleHome } from './utils/roleHome'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import NotFound from './pages/NotFound'

// Owner pages
import OwnerDashboard from './pages/owner/Dashboard'
import OwnerBarbers from './pages/owner/Barbers'
import OwnerServices from './pages/owner/Services'
import OwnerSettings from './pages/owner/Settings'
import OwnerAgenda from './pages/owner/Agenda'
import OwnerFinances from './pages/owner/Finances'
import OwnerOffers from './pages/owner/Offers'
import OwnerAdvertising from './pages/owner/Advertising'

// Barber pages
import BarberAgenda from './pages/barber/Agenda'
import BarberCalendar from './pages/barber/Calendar'
import BarberEarnings from './pages/barber/Earnings'
import BarberAppointments from './pages/barber/Appointments'
import BarberMyCard from './pages/barber/MyCard'

// Superadmin pages
import SuperDashboard from './pages/superadmin/Dashboard'
import SuperBarbershops from './pages/superadmin/Barbershops'
import SuperUsers from './pages/superadmin/Users'
import SuperSubscriptions from './pages/superadmin/Subscriptions'
import SuperAdvertising from './pages/superadmin/Advertising'

// Shared pages
import Profile from './pages/shared/Profile'

// Public pages — accesibles sin iniciar sesión. Las tiendas exigen URLs
// públicas para términos, privacidad y eliminación de cuenta.
import Landing from './pages/public/Landing'
import PublicTerms from './pages/public/Terms'
import PublicPrivacy from './pages/public/Privacy'
import PublicCookies from './pages/public/Cookies'
import PublicDeleteAccount from './pages/public/DeleteAccount'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
})

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <span className="text-4xl mb-4">✂</span>
      <h2 className="text-xl font-semibold text-primary font-heading">Próximamente</h2>
      <p className="text-secondary text-sm mt-1">Esta sección está en desarrollo</p>
    </div>
  )
}

function GlobalShortcuts() {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!searchOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={() => setSearchOpen(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-gray-soft">
          <span className="text-secondary">🔍</span>
          <input autoFocus placeholder="Buscar clientes, citas, barberos..."
            className="flex-1 text-sm outline-none text-black-soft"
            onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)} />
          <kbd className="text-xs text-secondary border border-gray-soft rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="p-4 text-center text-sm text-secondary">
          Escribe para buscar en toda la aplicación
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore()
  // Sesión válida = autenticada Y con un rol que tiene panel web. Una sesión
  // vieja de CLIENT no debe redirigir desde /login (sería un bucle).
  const home = roleHome(user?.role)
  const hasPanel = isAuthenticated && !!home

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', borderRadius: '10px' } }} />
        <GlobalShortcuts />
        <Routes>
          {/* ─── Públicas: sin sesión, sin sidebar ─── */}
          <Route path="/" element={hasPanel ? <Navigate to={home} replace /> : <Landing />} />
          <Route path="/terminos" element={<PublicTerms />} />
          <Route path="/privacidad" element={<PublicPrivacy />} />
          <Route path="/cookies" element={<PublicCookies />} />
          {/* /confirmar es la ruta del enlace que llega por correo */}
          <Route path="/eliminar-cuenta" element={<PublicDeleteAccount />} />
          <Route path="/eliminar-cuenta/confirmar" element={<PublicDeleteAccount />} />

          {/* ─── Autenticación ─── */}
          <Route path="/login" element={hasPanel ? <Navigate to={home} replace /> : <Login />} />

          {/* ─── Privadas: redirigen a /login sin sesión ─── */}
          {/* Owner */}
          <Route path="/owner/dashboard" element={<ProtectedRoute roles={['OWNER']}><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/owner/barbers" element={<ProtectedRoute roles={['OWNER']}><OwnerBarbers /></ProtectedRoute>} />
          <Route path="/owner/services" element={<ProtectedRoute roles={['OWNER']}><OwnerServices /></ProtectedRoute>} />
          <Route path="/owner/settings" element={<ProtectedRoute roles={['OWNER']}><OwnerSettings /></ProtectedRoute>} />
          <Route path="/owner/appointments" element={<ProtectedRoute roles={['OWNER']}><OwnerAgenda /></ProtectedRoute>} />
          <Route path="/owner/finances" element={<ProtectedRoute roles={['OWNER']}><OwnerFinances /></ProtectedRoute>} />
          <Route path="/owner/offers" element={<ProtectedRoute roles={['OWNER']}><OwnerOffers /></ProtectedRoute>} />
          <Route path="/owner/advertising" element={<ProtectedRoute roles={['OWNER']}><OwnerAdvertising /></ProtectedRoute>} />
          <Route path="/owner/*" element={<ProtectedRoute roles={['OWNER']}><ComingSoon /></ProtectedRoute>} />

          {/* Barber */}
          <Route path="/barber/agenda" element={<ProtectedRoute roles={['BARBER']}><BarberAgenda /></ProtectedRoute>} />
          <Route path="/barber/calendar" element={<ProtectedRoute roles={['BARBER']}><BarberCalendar /></ProtectedRoute>} />
          <Route path="/barber/earnings" element={<ProtectedRoute roles={['BARBER']}><BarberEarnings /></ProtectedRoute>} />
          <Route path="/barber/appointments" element={<ProtectedRoute roles={['BARBER']}><BarberAppointments /></ProtectedRoute>} />
          <Route path="/barber/card" element={<ProtectedRoute roles={['BARBER']}><BarberMyCard /></ProtectedRoute>} />
          <Route path="/barber/*" element={<ProtectedRoute roles={['BARBER']}><ComingSoon /></ProtectedRoute>} />

          {/* Superadmin */}
          <Route path="/superadmin/dashboard" element={<ProtectedRoute roles={['ADMIN']}><SuperDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/barbershops" element={<ProtectedRoute roles={['ADMIN']}><SuperBarbershops /></ProtectedRoute>} />
          <Route path="/superadmin/users" element={<ProtectedRoute roles={['ADMIN']}><SuperUsers /></ProtectedRoute>} />
          <Route path="/superadmin/subscriptions" element={<ProtectedRoute roles={['ADMIN']}><SuperSubscriptions /></ProtectedRoute>} />
          <Route path="/superadmin/ads" element={<ProtectedRoute roles={['ADMIN']}><SuperAdvertising /></ProtectedRoute>} />
          <Route path="/superadmin/*" element={<ProtectedRoute roles={['ADMIN']}><ComingSoon /></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/profile" element={<ProtectedRoute roles={['OWNER', 'BARBER', 'ADMIN']}><Profile /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
