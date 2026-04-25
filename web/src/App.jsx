import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'

// Owner pages
import OwnerDashboard from './pages/owner/Dashboard'
import OwnerBarbers from './pages/owner/Barbers'
import OwnerServices from './pages/owner/Services'
import OwnerSettings from './pages/owner/Settings'
import OwnerAgenda from './pages/owner/Agenda'
import OwnerFinances from './pages/owner/Finances'
import OwnerOffers from './pages/owner/Offers'
import OwnerAdvertising from './pages/owner/Advertising'

// Superadmin pages
import SuperDashboard from './pages/superadmin/Dashboard'
import SuperBarbershops from './pages/superadmin/Barbershops'
import SuperUsers from './pages/superadmin/Users'
import SuperSubscriptions from './pages/superadmin/Subscriptions'
import SuperAdvertising from './pages/superadmin/Advertising'

// Shared pages
import Profile from './pages/shared/Profile'

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

export default function App() {
  const { isAuthenticated, user } = useAuthStore()
  const defaultPath = user?.role === 'ADMIN' ? '/superadmin/dashboard' : user?.role === 'OWNER' ? '/owner/dashboard' : '/barber/agenda'

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', borderRadius: '10px' } }} />
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to={defaultPath} replace /> : <Login />} />

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

          <Route path="/" element={isAuthenticated ? <Navigate to={defaultPath} replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
