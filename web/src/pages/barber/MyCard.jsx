import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Share2, Copy, Star, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { formatCurrency, formatTime, formatDate } from '../../utils/formatters'

export default function BarberMyCard() {
  const qc = useQueryClient()
  const { user, updateUser } = useAuthStore()
  const avatarRef = useRef()
  const [editOpen, setEditOpen] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editForm, setEditForm] = useState({ specialty: '', bio: '' })

  const { data: barberData } = useQuery({
    queryKey: ['my-barber-profile'],
    queryFn: () => api.get('/api/barbers/my').then(r => r.data),
  })
  const barberId = barberData?.barber?.id || barberData?.id

  const { data: cardData, isLoading } = useQuery({
    queryKey: ['barber-card', barberId],
    queryFn: () => api.get(`/api/barber-card/${barberId}`).then(r => r.data),
    enabled: !!barberId,
  })

  const barber = cardData?.barber || {}
  const upcomingAppts = cardData?.upcomingAppointments || []
  const recentReviews = cardData?.recentReviews || []
  const todayStats = cardData?.today || {}

  const { mutate: updateBarber, isPending: saving } = useMutation({
    mutationFn: (data) => api.put(`/api/barbers/${barberId}`, data),
    onSuccess: () => {
      toast.success('Perfil actualizado')
      qc.invalidateQueries({ queryKey: ['barber-card', barberId] })
      setEditOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
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
      toast.success('Foto actualizada')
      qc.invalidateQueries({ queryKey: ['barber-card', barberId] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al subir imagen')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/barber/${barberId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success('Enlace copiado')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const openEdit = () => {
    setEditForm({ specialty: barber.specialty || '', bio: barber.bio || '' })
    setEditOpen(true)
  }

  const avgRating = recentReviews.length
    ? (recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(1)
    : (barber.rating || 0).toFixed(1)

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} lines={4} />)}</div>
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* The Card */}
      <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 text-white shadow-xl">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-2xl font-bold overflow-hidden border-2 border-white/30">
              {user?.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                : user?.name?.[0]?.toUpperCase() || '?'
              }
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button onClick={() => avatarRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-accent rounded-full w-6 h-6 flex items-center justify-center text-white text-xs cursor-pointer border border-white">
              {uploadingAvatar ? '⟳' : '✏'}
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold font-heading">{user?.name}</h2>
            <p className="text-cream/80 text-sm mt-0.5">{barber.specialty || 'Barbero profesional'}</p>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={14} className={s <= Math.round(parseFloat(avgRating)) ? 'text-accent fill-accent' : 'text-white/30'} />
              ))}
              <span className="text-sm ml-1">{avgRating} ({recentReviews.length || barber.totalReviews || 0} reseñas)</span>
            </div>
            <p className="text-cream/60 text-xs mt-1">✂️ {barber.barbershopName || '—'}</p>
          </div>
        </div>

        {/* Today stats */}
        <div className="bg-white/10 rounded-xl p-4 mb-4">
          <p className="text-cream/70 text-xs font-medium mb-2">HOY</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{todayStats.cuts || 0}</p>
              <p className="text-cream/60 text-xs">cortes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-accent">{formatCurrency(todayStats.earnings || 0).replace(' COP','')}</p>
              <p className="text-cream/60 text-xs">ganado</p>
            </div>
            <div>
              <p className="text-sm font-medium">
                {upcomingAppts[0] ? `${formatTime(upcomingAppts[0].startTime)}` : '—'}
              </p>
              <p className="text-cream/60 text-xs">próxima</p>
            </div>
          </div>
        </div>

        {/* Upcoming appointments */}
        {upcomingAppts.length > 0 && (
          <div className="mb-4">
            <p className="text-cream/70 text-xs font-semibold mb-2 uppercase">Próximas citas</p>
            <div className="space-y-1.5">
              {upcomingAppts.slice(0, 3).map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-1.5">
                  <span className="text-sm font-medium">{formatTime(a.startTime)}</span>
                  <span className="text-sm text-cream/80 truncate mx-2">{a.client?.name?.split(' ')[0]} {a.client?.name?.split(' ')[1]?.[0]}.</span>
                  <span className="text-xs text-cream/60">{a.service?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent reviews */}
        {recentReviews.length > 0 && (
          <div>
            <p className="text-cream/70 text-xs font-semibold mb-2 uppercase">Últimas reseñas</p>
            <div className="space-y-1.5">
              {recentReviews.slice(0, 2).map((r, i) => (
                <div key={i} className="bg-white/10 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={11} className={s <= r.rating ? 'text-accent fill-accent' : 'text-white/30'} />
                    ))}
                  </div>
                  {r.comment && <p className="text-cream/80 text-xs italic">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copiado' : 'Copiar enlace'}
        </Button>
        <Button className="flex-1" onClick={openEdit}>
          Editar perfil
        </Button>
      </div>

      {/* All reviews */}
      {recentReviews.length > 0 && (
        <Card title="Todas mis reseñas">
          <div className="space-y-3">
            {recentReviews.map((r, i) => (
              <div key={i} className="p-3 bg-cream rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={13} className={s <= r.rating ? 'text-accent fill-accent' : 'text-gray-soft'} />
                    ))}
                    <span className="text-xs font-medium ml-1">{r.rating}/5</span>
                  </div>
                  <span className="text-xs text-secondary">{formatDate(r.createdAt)}</span>
                </div>
                {r.comment && <p className="text-sm text-secondary italic">"{r.comment}"</p>}
                {r.client?.name && <p className="text-xs text-gray-400 mt-1">— {r.client.name}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar mi perfil"
        footer={<><Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button><Button onClick={() => updateBarber(editForm)} loading={saving}>Guardar</Button></>}>
        <div className="space-y-4">
          <Input label="Especialidad" placeholder="Ej: Fade, cortes clásicos, barba..."
            value={editForm.specialty} onChange={e => setEditForm({ ...editForm, specialty: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Bio (opcional)</label>
            <textarea rows={4} className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm outline-none focus:border-accent resize-none"
              placeholder="Cuéntale a tus clientes sobre ti..."
              value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
