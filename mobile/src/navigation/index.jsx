import { useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import useAuthStore from '../store/authStore'
import LoadingScreen from '../components/ui/LoadingScreen'
import AuthNavigator from './AuthNavigator'
import ClientNavigator from './ClientNavigator'
import BarberNavigator from './BarberNavigator'
import OwnerRedirectScreen from '../screens/shared/OwnerRedirectScreen'
import PendingApproval from '../screens/auth/PendingApproval'

export default function RootNavigator({ navigationRef }) {
  const { isAuthenticated, role, isLoading, init, pendingApproval } = useAuthStore()
  const internalRef = useRef(null)
  const ref = navigationRef || internalRef

  useEffect(() => { init() }, [])

  if (isLoading) return <LoadingScreen />

  return (
    <NavigationContainer ref={ref}>
      {pendingApproval && <PendingApproval />}
      {!pendingApproval && !isAuthenticated && <AuthNavigator />}
      {!pendingApproval && isAuthenticated && role === 'CLIENT' && <ClientNavigator />}
      {!pendingApproval && isAuthenticated && role === 'BARBER' && <BarberNavigator />}
      {!pendingApproval && isAuthenticated && (role === 'OWNER' || role === 'ADMIN') && <OwnerRedirectScreen />}
    </NavigationContainer>
  )
}
