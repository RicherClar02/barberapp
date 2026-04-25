import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Image } from 'lucide-react'
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

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '', price: '', barbershopId: shopId }); setErrors({}); setModalOpen(true) }
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, description: s.description || '', price: String(s.price), barbershopId: shopId }); setErrors({}); setModalOpen(true) }

  const validate = () => {
    const e = {}
    if (!form.name) e.name = 'Nombre requerido'
    if (!form.price || isNaN(form.price)) e.price = 'Precio inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const { mutate: saveService, isPending: saving } = useMutation({
    mutationFn: (data) => editing ? api.put(`/api/services/${editing.id}`, data) : api.post('/api/services', data),
    onSuccess: () => { toast.success(editing ? 'Servicio actualizado' : 'Servicio creado'); qc.invalidateQueries(['services', shopId]); setModalOpen(false) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: toggleService } = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/api/services/${id}`, { isActive: !isActive }),
    onSuccess: () => { toast.success('Servicio actualizado'); qc.invalidateQueries(['services', shopId]) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const handleUploadImage = async (serviceId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post(`/api/upload/service-image/${serviceId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Imagen actualizada')
      qc.invalidateQueries(['services', shopId])
    } catch (err) { toast.error(err.response?.data?.message || 'Error al subir imagen') }
  }

  const handleSave = () => {
    if (!validate()) return
    saveService({ ...form, price: parseFloat(form.price) })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Plus size={16} /> Agregar Servicio</Button>
      </div>

      {isLoading ? (
        <p className="text-secondary text-center py-8">Cargando servicios...</p>
      ) : services.length === 0 ? (
        <Card><p className="text-center text-secondary py-8">No hay servicios registrados</p></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <Card key={s.id} className={!s.isActive ? 'opacity-60' : ''}>
              {s.image ? (
                <img src={s.image} alt={s.name} className="w-full h-36 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-full h-36 bg-cream rounded-lg mb-3 flex items-center justify-center text-4xl">✂</div>
              )}
              <h3 className="font-semibold text-black-soft">{s.name}</h3>
              {s.description && <p className="text-xs text-secondary mt-1 line-clamp-2">{s.description}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-bold text-accent font-heading">{formatCurrency(s.price)}</span>
                <span className="text-xs text-secondary">40 min</span>
              </div>
              <span className={`text-xs font-medium ${s.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                {s.isActive !== false ? '● Activo' : '● Inactivo'}
              </span>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Edit2 size={13} /> Editar</Button>
                <label className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border-2 border-secondary text-secondary hover:bg-secondary hover:text-white cursor-pointer transition-all">
                  <Image size={13} /> Imagen
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUploadImage(s.id, e.target.files[0])} />
                </label>
                <Button size="sm" variant={s.isActive !== false ? 'danger' : 'secondary'}
                  onClick={() => toggleService({ id: s.id, isActive: s.isActive !== false })}>
                  {s.isActive !== false ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Servicio' : 'Nuevo Servicio'}
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} loading={saving}>Guardar</Button></>}>
        <div className="space-y-4">
          <Input label="Nombre del servicio" placeholder="Ej: Corte Clásico" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-secondary">Descripción (opcional)</label>
            <textarea className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
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
