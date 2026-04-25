import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const avatarRef = useRef()

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    whatsapp: user?.whatsapp || '',
  })

  const [notifPrefs, setNotifPrefs] = useState({
    whatsappNotifs: user?.notifPrefs?.whatsapp ?? true,
    pushNotifs: user?.notifPrefs?.push ?? true,
    reminders: user?.notifPrefs?.reminders ?? true,
  })

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const { mutate: saveProfile, isPending: saving } = useMutation({
    mutationFn: () => api.put(`/api/auth/profile`, { ...form, notifPrefs: notifPrefs }),
    onSuccess: (res) => {
      const updated = res.data?.user || res.data
      if (updated) updateUser(updated)
      toast.success('Perfil actualizado')
      qc.invalidateQueries(['profile'])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al guardar'),
  })

  const { mutate: changePassword, isPending: changingPw } = useMutation({
    mutationFn: () => api.put('/api/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next }),
    onSuccess: () => {
      toast.success('Contraseña actualizada')
      setPwForm({ current: '', next: '', confirm: '' })
      setPwErrors({})
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Contraseña actual incorrecta'),
  })

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post(`/api/upload/barber-avatar/${user.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const avatarUrl = res.data?.url || res.data?.avatar
      if (avatarUrl) updateUser({ avatar: avatarUrl })
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al subir imagen')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const validatePw = () => {
    const e = {}
    if (!pwForm.current) e.current = 'Contraseña actual requerida'
    if (!pwForm.next || pwForm.next.length < 6) e.next = 'Mínimo 6 caracteres'
    if (pwForm.next !== pwForm.confirm) e.confirm = 'Las contraseñas no coinciden'
    setPwErrors(e)
    return Object.keys(e).length === 0
  }

  const handleChangePw = () => {
    if (!validatePw()) return
    changePassword()
  }

  const ROLE_LABEL = { OWNER: 'Dueño', BARBER: 'Barbero', ADMIN: 'Administrador', CLIENT: 'Cliente' }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Avatar */}
      <Card title="Foto de perfil">
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
              {user?.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                : user?.name?.[0]?.toUpperCase() || '?'
              }
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-black-soft">{user?.name}</p>
            <p className="text-secondary text-sm">{ROLE_LABEL[user?.role] || user?.role}</p>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <Button size="sm" variant="outline" className="mt-2" onClick={() => avatarRef.current?.click()}
              disabled={uploadingAvatar}>
              {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Personal Info */}
      <Card title="Información personal">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre completo" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} />
            <Input label="Teléfono" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="WhatsApp" placeholder="+57 300 000 0000" value={form.whatsapp}
              onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveProfile()} loading={saving}>Guardar cambios</Button>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card title="Preferencias de notificación">
        <div className="space-y-4">
          {[
            { key: 'whatsappNotifs', label: 'Notificaciones por WhatsApp', desc: 'Recibe alertas de citas por WhatsApp' },
            { key: 'pushNotifs', label: 'Notificaciones push', desc: 'Notificaciones en el navegador' },
            { key: 'reminders', label: 'Recordatorios activados', desc: 'Recordatorios 15 minutos antes de cada cita' },
          ].map(pref => (
            <div key={pref.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black-soft text-sm">{pref.label}</p>
                <p className="text-xs text-secondary">{pref.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifPrefs[pref.key]}
                  onChange={e => setNotifPrefs({ ...notifPrefs, [pref.key]: e.target.checked })}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-soft rounded-full peer peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={() => saveProfile()} loading={saving} variant="outline">Guardar preferencias</Button>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card title="Cambiar contraseña">
        <div className="space-y-4">
          <Input label="Contraseña actual" type="password" value={pwForm.current}
            onChange={e => setPwForm({ ...pwForm, current: e.target.value })} error={pwErrors.current} />
          <Input label="Nueva contraseña" type="password" value={pwForm.next}
            onChange={e => setPwForm({ ...pwForm, next: e.target.value })} error={pwErrors.next} />
          <Input label="Confirmar nueva contraseña" type="password" value={pwForm.confirm}
            onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} error={pwErrors.confirm} />
          <div className="flex justify-end">
            <Button onClick={handleChangePw} loading={changingPw}>Cambiar contraseña</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
