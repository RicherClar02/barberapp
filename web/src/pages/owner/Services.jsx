import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Clock, Trash2, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { formatCurrency } from '../../utils/formatters'

export default function OwnerServices() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', barbershopId: '' })
  const [errors, setErrors] = useState({})

  const { data: shopData } = useQuery({
    queryKey: ['my-barbershops'],
    queryFn: () => api.get('/api/barbershops/my').then(r => r.data),
  })
  const shopId = shopData?.barbershops?.[0]?.id || shopData?.[0]?.id

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services', shopId],
    queryFn: () => api.get(`/api/services/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })
  const services = servicesData?.services || servicesData || []

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '', price: '', barbershopId: shopId })
    setErrors({})
    setModalOpen(true)
  }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, description: s.description || '', price: String(s.price), barbershopId: shopId })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.name) e.name = 'Nombre requerido'
    if (!form.price || isNaN(form.price)) e.price = 'Precio inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const { mutate: saveService, isPending: saving } = useMutation({
    mutationFn: (data) => editing ? api.put(`/api/services/${editing.id}`, data) : api.post('/api/services', data),
    onSuccess: () => { toast.success(editing ? 'Servicio actualizado' : 'Servicio creado'); qc.invalidateQueries({ queryKey: ['services', shopId] }); setModalOpen(false) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: toggleService } = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/api/services/${id}`, { isActive: !isActive }),
    onSuccess: () => { toast.success('Servicio actualizado'); qc.invalidateQueries({ queryKey: ['services', shopId] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const handleUploadImage = async (serviceId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post(`/api/upload/service-image/${serviceId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Imagen actualizada')
      qc.invalidateQueries({ queryKey: ['services', shopId] })
    } catch (err) { toast.error(err.response?.data?.message || 'Error al subir imagen') }
  }

  const handleSave = () => {
    if (!validate()) return
    saveService({ ...form, price: parseFloat(form.price) })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary font-heading">Servicios</h2>
          <p className="text-sm text-muted">{services.length} servicios registrados</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
        >
          <Plus size={16} /> + Agregar Servicio
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-56 bg-cream rounded-xl animate-pulse" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <p className="text-muted">No hay servicios registrados aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className={`bg-white rounded-xl shadow-card overflow-hidden flex flex-col ${!s.isActive ? 'opacity-60' : ''}`}>
              {s.image ? (
                <img src={s.image} alt={s.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-cream flex items-center justify-center text-4xl">✂</div>
              )}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div>
                  <h3 className="font-semibold text-primary font-heading">{s.name}</h3>
                  {s.description && <p className="text-xs text-muted mt-1 line-clamp-2">{s.description}</p>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary font-heading">{formatCurrency(s.price)}</span>
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Clock size={11} /> {s.duration ?? 40} min
                  </span>
                </div>
                <span className={`text-xs font-semibold self-start px-2 py-0.5 rounded-full ${s.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.isActive !== false ? '● Activo' : '● Inactivo'}
                </span>
                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-[rgba(74,44,10,0.06)]">
                  <button
                    onClick={() => openEdit(s)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-[rgba(74,44,10,0.15)] text-primary rounded-lg hover:bg-cream transition-colors"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-[rgba(74,44,10,0.15)] text-primary rounded-lg hover:bg-cream transition-colors cursor-pointer">
                    <Image size={12} />
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUploadImage(s.id, e.target.files[0])} />
                  </label>
                  <button
                    onClick={() => toggleService({ id: s.id, isActive: s.isActive !== false })}
                    className="flex items-center justify-center px-3 py-2 text-xs font-medium border border-red-200 text-destructive rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Servicio' : 'Nuevo Servicio'}
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} loading={saving}>Guardar</Button></>}>
        <div className="space-y-4">
          <Input label="Nombre del servicio" placeholder="Ej: Corte Clásico" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted">Descripción (opcional)</label>
            <textarea className="w-full rounded-lg border border-[rgba(74,44,10,0.1)] px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none bg-white"
              rows={2} placeholder="Descripción del servicio..." value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <Input label="Precio (COP)" type="number" placeholder="25000" value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })} error={errors.price} />
        </div>
      </Modal>
    </div>
  )
}
