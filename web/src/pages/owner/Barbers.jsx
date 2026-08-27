import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Star, Scissors, Edit2, Power, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import ImageUploader from '../../components/ui/ImageUploader'
import { formatCurrency } from '../../utils/formatters'

const PLAN_LIMITS = { BASIC: 2, STANDARD: 4, PREMIUM: Infinity }

export default function OwnerBarbers() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingBarber, setEditingBarber] = useState(null)
  const [editForm, setEditForm] = useState({ specialty: '', bio: '' })
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [form, setForm] = useState({ email: '', specialty: '', bio: '' })
  const [formErrors, setFormErrors] = useState({})

  const { data: shopData } = useQuery({
    queryKey: ['my-barbershops'],
    queryFn: () => api.get('/api/barbershops/my').then(r => r.data),
  })
  const shop = shopData?.barbershops?.[0] || shopData?.[0]
  const shopId = shop?.id

  const { data: barbersData, isLoading } = useQuery({
    queryKey: ['barbers', shopId],
    queryFn: () => api.get(`/api/barbers/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const barbers = barbersData?.barbers || barbersData || []
  const planLimit = PLAN_LIMITS[shop?.plan] || 1
  const activeCount = barbers.filter(b => b.isActive !== false).length

  const { mutate: addBarber, isPending: adding } = useMutation({
    mutationFn: async (data) => {
      const { data: lookup } = await api.get('/api/auth/find-by-email', {
        params: { email: data.email },
      })
      // El backend responde 200 con found:false cuando no hay cuenta. Sin este
      // chequeo, leer lookup.user.id explotaría con un TypeError en vez de
      // mostrarle al dueño qué pasó.
      if (!lookup.found) {
        throw new Error('No hay ninguna cuenta con ese correo. El barbero tiene que registrarse primero en la app.')
      }
      if (lookup.user.role !== 'BARBER') {
        throw new Error(`${lookup.user.name} tiene una cuenta, pero no está registrada como barbero.`)
      }
      return api.post('/api/barbers', { userId: lookup.user.id, barbershopId: shopId, specialty: data.specialty, bio: data.bio })
    },
    onSuccess: () => {
      toast.success('Barbero agregado')
      qc.invalidateQueries({ queryKey: ['barbers', shopId] })
      setAddOpen(false)
      setForm({ email: '', specialty: '', bio: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Error al agregar barbero'),
  })

  const { mutate: toggleBarber } = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/api/barbers/${id}`, { isActive: !isActive }),
    onSuccess: () => { toast.success('Barbero actualizado'); qc.invalidateQueries({ queryKey: ['barbers', shopId] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: editBarber, isPending: editing } = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/barbers/${id}`, data),
    onSuccess: () => {
      toast.success('Barbero actualizado')
      qc.invalidateQueries({ queryKey: ['barbers', shopId] })
      setEditOpen(false)
      setEditingBarber(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al actualizar'),
  })

  const openEdit = (b) => {
    setEditingBarber(b)
    setEditForm({ specialty: b.specialty || '', bio: b.bio || '' })
    setEditOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email requerido'
    if (!form.specialty) e.specialty = 'Especialidad requerida'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleAdd = () => {
    if (!validate()) return
    addBarber(form)
  }

  const openCard = async (b) => {
    try {
      const { data } = await api.get(`/api/barber-card/${b.id}`)
      setSelectedBarber(data)
      setCardOpen(true)
    } catch { toast.error('No se pudo cargar la tarjeta') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary font-heading">Barberos</h2>
          <p className="text-sm text-muted">
            <span className="font-semibold text-primary">{activeCount}/{planLimit === Infinity ? '∞' : planLimit}</span> barberos activos — Plan {shop?.plan || '—'}
            {planLimit !== Infinity && activeCount >= planLimit && (
              <span className="ml-2 text-destructive text-xs">— Actualiza tu plan para agregar más</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          disabled={planLimit !== Infinity && activeCount >= planLimit}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={16} /> + Agregar Barbero
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-cream rounded-xl animate-pulse" />)}
        </div>
      ) : barbers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <p className="text-muted">No hay barberos registrados aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers.map((b) => {
            const avgRating = b.reviews?.length
              ? (b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length).toFixed(1)
              : '—'
            const isActive = b.isActive !== false
            // Regla de negocio: rating < 3.0 con mínimo 5 reseñas = alerta roja
            const lowRating = b.lowRating === true
            return (
              <div key={b.id} className={`bg-white rounded-xl shadow-card p-5 flex flex-col gap-4 ${!isActive ? 'opacity-60' : ''} ${lowRating ? 'border-2 border-red-500' : ''}`}>
                {lowRating && (
                  <div className="bg-red-50 rounded-lg px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700">
                      <AlertTriangle size={13} /> Rating bajo
                    </span>
                    <p className="text-xs text-red-600 mt-0.5">
                      Habla con tu barbero para mejorar el servicio
                    </p>
                  </div>
                )}
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
                    {b.user?.avatar
                      ? <img src={b.user.avatar} alt="" className="w-full h-full object-cover" />
                      : b.user?.name?.[0]?.toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary font-heading truncate">{b.user?.name}</p>
                    <p className="text-xs text-muted truncate">{b.specialty || 'Sin especialidad'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted">Rating</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-bold text-primary">{avgRating}</span>
                      <span className="text-xs text-muted">({b.reviews?.length || 0})</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Ganado este mes</p>
                    <p className="text-sm font-bold text-accent mt-0.5">{formatCurrency(b.earningsThisMonth || 0)}</p>
                  </div>
                </div>

                {b.bio && <p className="text-xs text-muted line-clamp-2">{b.bio}</p>}

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-[rgba(74,44,10,0.06)]">
                  <button
                    onClick={() => openCard(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-[rgba(74,44,10,0.15)] text-primary rounded-lg hover:bg-cream transition-colors"
                  >
                    <Scissors size={13} /> Ver tarjeta
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-[rgba(74,44,10,0.15)] text-primary rounded-lg hover:bg-cream transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => toggleBarber({ id: b.id, isActive: isActive })}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-red-200 text-destructive rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Power size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal agregar */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar Barbero"
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button><Button onClick={handleAdd} loading={adding}>Agregar</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-muted">El usuario debe estar registrado en la app con rol BARBER.</p>
          <Input label="Email del barbero" type="email" placeholder="barbero@email.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} error={formErrors.email} />
          <Input label="Especialidad" placeholder="Ej: Fade, degradados clásicos..." value={form.specialty}
            onChange={e => setForm({ ...form, specialty: e.target.value })} error={formErrors.specialty} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted">Bio (opcional)</label>
            <textarea className="w-full rounded-lg border border-[rgba(74,44,10,0.1)] px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none bg-white"
              rows={3} placeholder="Descripción breve del barbero..." value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Modal editar barbero */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Barbero"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={() => editBarber({ id: editingBarber?.id, ...editForm })} loading={editing}>Guardar</Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="Especialidad" placeholder="Ej: Fade, degradados clásicos..." value={editForm.specialty}
            onChange={e => setEditForm({ ...editForm, specialty: e.target.value })} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted">Bio (opcional)</label>
            <textarea className="w-full rounded-lg border border-[rgba(74,44,10,0.1)] px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none bg-white"
              rows={3} placeholder="Descripción breve del barbero..." value={editForm.bio}
              onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
          </div>
          {editingBarber?.id && (
            <ImageUploader
              label="Foto de perfil del barbero"
              uploadUrl={`/api/upload/barber-avatar/${editingBarber.id}`}
              currentUrl={editingBarber?.user?.avatar}
              onSuccess={() => qc.invalidateQueries({ queryKey: ['barbers', shopId] })}
            />
          )}
        </div>
      </Modal>

      {/* Modal tarjeta */}
      <Modal open={cardOpen} onClose={() => setCardOpen(false)} title="Tarjeta del Barbero">
        {selectedBarber && (
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold mx-auto overflow-hidden">
              {selectedBarber.barber?.user?.avatar
                ? <img src={selectedBarber.barber.user.avatar} alt="" className="w-full h-full object-cover" />
                : selectedBarber.barber?.user?.name?.[0]?.toUpperCase()
              }
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary font-heading">{selectedBarber.barber?.user?.name}</h3>
              <p className="text-muted text-sm">{selectedBarber.barber?.specialty}</p>
              <p className="text-accent font-semibold">{selectedBarber.barbershop?.name}</p>
            </div>
            {selectedBarber.barber?.bio && <p className="text-sm text-muted italic">{selectedBarber.barber.bio}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
