import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Star, Scissors } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

const PLAN_LIMITS = { BASIC: 1, STANDARD: 3, PREMIUM: Infinity }

export default function OwnerBarbers() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
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
      const userRes = await api.get(`/api/auth/find-by-email?email=${data.email}`)
      return api.post('/api/barbers', { userId: userRes.data.user.id, barbershopId: shopId, specialty: data.specialty, bio: data.bio })
    },
    onSuccess: () => {
      toast.success('Barbero agregado')
      qc.invalidateQueries(['barbers', shopId])
      setAddOpen(false)
      setForm({ email: '', specialty: '', bio: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al agregar barbero'),
  })

  const { mutate: toggleBarber } = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/api/barbers/${id}`, { isActive: !isActive }),
    onSuccess: () => { toast.success('Barbero actualizado'); qc.invalidateQueries(['barbers', shopId]) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary">
            Plan {shop?.plan || '—'}:
            <span className="font-semibold text-primary ml-1">
              {activeCount}/{planLimit === Infinity ? '∞' : planLimit} barberos
            </span>
            {planLimit !== Infinity && activeCount >= planLimit && (
              <span className="ml-2 text-xs text-red-500">— Actualiza tu plan para agregar más</span>
            )}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={planLimit !== Infinity && activeCount >= planLimit}>
          <UserPlus size={16} /> Agregar Barbero
        </Button>
      </div>

      {/* Grid de barberos */}
      {isLoading ? (
        <p className="text-secondary text-center py-8">Cargando...</p>
      ) : barbers.length === 0 ? (
        <Card>
          <p className="text-center text-secondary py-8">No hay barberos registrados aún</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers.map((b) => {
            const avgRating = b.reviews?.length ? (b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length).toFixed(1) : '—'
            return (
              <Card key={b.id} className={!b.isActive ? 'opacity-60' : ''}>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {b.user?.avatar
                      ? <img src={b.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      : b.user?.name?.[0]?.toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-black-soft truncate">{b.user?.name}</p>
                    <p className="text-xs text-secondary">{b.specialty || 'Sin especialidad'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-medium">{avgRating}</span>
                      <span className="text-xs text-gray-400 ml-1">({b.reviews?.length || 0} reseñas)</span>
                    </div>
                    <span className={`text-xs font-medium ${b.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                      {b.isActive !== false ? '● Activo' : '● Inactivo'}
                    </span>
                  </div>
                </div>
                {b.bio && <p className="text-xs text-secondary mt-3 line-clamp-2">{b.bio}</p>}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => openCard(b)}>
                    <Scissors size={13} /> Ver tarjeta
                  </Button>
                  <Button size="sm" variant={b.isActive !== false ? 'danger' : 'secondary'}
                    onClick={() => toggleBarber({ id: b.id, isActive: b.isActive !== false })}>
                    {b.isActive !== false ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal agregar */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Agregar Barbero"
        footer={<><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button><Button onClick={handleAdd} loading={adding}>Agregar</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-secondary">El usuario debe estar registrado en la app con rol BARBER.</p>
          <Input label="Email del barbero" type="email" placeholder="barbero@email.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} error={formErrors.email} />
          <Input label="Especialidad" placeholder="Ej: Fade, degradados clásicos..." value={form.specialty}
            onChange={e => setForm({ ...form, specialty: e.target.value })} error={formErrors.specialty} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-secondary">Bio (opcional)</label>
            <textarea className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none" rows={3}
              placeholder="Descripción breve del barbero..." value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Modal tarjeta */}
      <Modal open={cardOpen} onClose={() => setCardOpen(false)} title="Tarjeta del Barbero">
        {selectedBarber && (
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold mx-auto">
              {selectedBarber.barber?.user?.avatar
                ? <img src={selectedBarber.barber.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                : selectedBarber.barber?.user?.name?.[0]?.toUpperCase()
              }
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary font-heading">{selectedBarber.barber?.user?.name}</h3>
              <p className="text-secondary text-sm">{selectedBarber.barber?.specialty}</p>
              <p className="text-accent font-semibold">{selectedBarber.barbershop?.name}</p>
            </div>
            {selectedBarber.barber?.bio && <p className="text-sm text-secondary italic">{selectedBarber.barber.bio}</p>}
            {selectedBarber.contact && (
              <div className="text-sm text-secondary space-y-1">
                {selectedBarber.contact.phone && <p>📞 {selectedBarber.contact.phone}</p>}
                {selectedBarber.contact.whatsapp && <p>💬 {selectedBarber.contact.whatsapp}</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
