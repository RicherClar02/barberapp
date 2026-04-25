import { Bell, ChevronDown, User, LogOut } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../../store/authStore'
import api from '../../api/axios'
import NotificationPanel from './NotificationPanel'

export default function Header({ title }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropRef = useRef()
  const bellRef = useRef()

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/api/notifications/my').then(r => r.data),
    refetchInterval: 30000,
  })

  const unread = notifs?.notifications?.filter(n => !n.isRead).length || 0

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-soft px-6 py-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-black-soft font-heading">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Notificaciones */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false) }}
            className="relative p-2 rounded-lg hover:bg-cream text-secondary cursor-pointer transition-colors">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* Avatar dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                : user?.name?.[0]?.toUpperCase() || 'U'
              }
            </div>
            <span className="text-sm font-medium text-black-soft hidden sm:block">{user?.name}</span>
            <ChevronDown size={16} className="text-secondary" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-soft z-50 py-1">
              <button
                onClick={() => { setDropdownOpen(false); navigate('/profile') }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-black-soft hover:bg-cream cursor-pointer"
              >
                <User size={16} /> Ver perfil
              </button>
              <div className="border-t border-gray-soft my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
