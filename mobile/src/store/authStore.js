import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'estilo_token'

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  role: null,
  isLoading: true,
  pendingApproval: false,

  init: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      const userStr = await SecureStore.getItemAsync('estilo_user')
      if (token && userStr) {
        const user = JSON.parse(userStr)
        set({ token, user, isAuthenticated: true, role: user.role, isLoading: false, pendingApproval: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  login: async (user, token) => {
    if (!token) {
      // Pending approval case — store user info only, no token
      await SecureStore.setItemAsync('estilo_user', JSON.stringify(user))
      set({ user, token: null, isAuthenticated: false, role: user.role, pendingApproval: true })
      return
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync('estilo_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true, role: user.role, pendingApproval: false })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync('estilo_user')
    set({ user: null, token: null, isAuthenticated: false, role: null, pendingApproval: false })
  },

  updateUser: async (userData) => {
    const updated = { ...get().user, ...userData }
    await SecureStore.setItemAsync('estilo_user', JSON.stringify(updated))
    set({ user: updated })
  },
}))

export default useAuthStore
