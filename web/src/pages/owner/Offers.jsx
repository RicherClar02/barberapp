import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate } from '../../utils/formatters'

function useCountdown(until) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = new Date(until) - new Date()
      if (diff <= 0) { setRemaining('Vencida'); return }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setRemaining(`${d}d ${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [until])
  return remaining
}

function CountdownBadge({ until }) {
  const remaining = useCountdown(until)
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
      <Clock size={11} /> {remaining}
    </span>
  )
}

export default function OwnerOffers() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', discountType: 'percent', discountPct: '', discountFixed: '',
    serviceId: '', validFrom: '', validUntil: '', code: '', maxUses: '',
  })
  const [errors, setErrors] = useState({})

  const { data: shopData } = useQuery({
    queryKey: ['my-barbershops'],
    queryFn: () => api.get('/api/barbershops/my').then(r => r.data),
  })
  const shop = shopData?.barbershops?.[0] || shopData?.[0]
  const shopId = shop?.id

  const { data: offersData, isLoading } = useQuery({
    queryKey: ['offers', shopId],
    queryFn: () => api.get(`/api/offers/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const { data: servicesData } = useQuery({
    queryKey: ['services', shopId],
    queryFn: () => api.get(`/api/services/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const offers = offersData?.offers || offersData || []
  const services = servicesData?.services || servicesData || []
  const plan = shop?.plan || 'BASIC'
  const activeOffers = offers.filter(o => o.isActive)

  const { mutate: saveOffer, isPending: saving } = useMutation({
    mutationFn: (data) => editing
      ? api.put(`/api/offers/${editing.id}`, data)
      : api.post('/api/offers', data),
    onSuccess: () => {
      toast.success(editing ? 'Oferta actualizada' : 'Oferta creada')
      qc.invalidateQueries(['offers', shopId])
      setModalOpen(false)
      setEditing(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: deleteOffer, isPending: deleting } = useMutation({
    mutationFn: (id) => api.delete(`/api/offers/${id}`),
    onSuccess: () => { toast.success('Oferta eliminada'); qc.invalidateQueries(['offers', shopId]); setConfirmDelete(null) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const openAdd = () => {
    setEditing(null)
    setForm({ title: '', description: '', discountType: 'percent', discountPct: '', discountFixed: '', serviceId: '', validFrom: '', validUntil: '', code: '', maxUses: '' })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (o) => {
    setEditing(o)
    setForm({
      title: o.title, description: o.description || '',
      discountType: o.discountPct ? 'percent' : 'fixed',
      discountPct: o.discountPct || '', discountFixed: o.discountFixed || '',
      serviceId: o.serviceId || '', validFrom: o.validFrom?.slice(0, 10) || '',
      validUntil: o.validUntil?.slice(0, 10) || '', code: o.code || '', maxUses: o.maxUses || '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.title) e.title = 'Título requerido'
    if (form.discountType === 'percent' && (!form.discountPct || isNaN(form.discountPct))) e.discount = 'Descuento inválido'
    if (form.discountType === 'fixed' && (!form.discountFixed || isNaN(form.discountFixed))) e.discount = 'Descuento inválido'
    if (!form.validFrom) e.validFrom = 'Fecha inicio requerida'
    if (!form.validUntil) e.validUntil = 'Fecha fin requerida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const data = {
      title: form.title, description: form.description,
      discountPct: form.discountType === 'percent' ? parseFloat(form.discountPct) : null,
      discountFixed: form.discountType === 'fixed' ? parseFloat(form.discountFixed) : null,
      serviceId: form.serviceId || null, validFrom: form.validFrom, validUntil: form.validUntil,
      code: form.code || null, maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      barbershopId: shopId,
    }
    saveOffer(data)
  }

  const isOfferActive = (o) => {
    const now = new Date()
    return o.isActive && new Date(o.validFrom) <= now && new Date(o.validUntil) >= now
  }

  return (
    <div className="space-y-6">
      {/* Plan restriction banner */}
      {plan === 'BASIC' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag size={20} className="text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Las ofertas están disponibles desde el plan Estándar</p>
              <p className="text-sm text-amber-600">Mejora tu plan para empezar a atraer más clientes con descuentos</p>
            </div>
          </div>
          <Button size="sm" onClick={() => window.location.href = '/owner/settings'}>Mejorar plan</Button>
        </div>
      )}

      {plan === 'STANDARD' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
          <Tag size={16} />
          <span>Plan Estándar: puedes tener <strong>1 oferta activa</strong> simultáneamente.
          {activeOffers.length >= 1 && ' — Desactiva la oferta actual para crear una nueva.'}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-end">
        <Button onClick={openAdd}
          disabled={plan === 'BASIC' || (plan === 'STANDARD' && activeOffers.length >= 1)}>
          <Plus size={16} /> Crear Oferta
        </Button>
      </div>

      {/* Offers list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-soft/30 rounded-xl animate-pulse" />)}
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Tag size={40} className="text-gray-soft mx-auto mb-3" />
            <p className="font-semibold text-primary">No hay ofertas creadas</p>
            <p className="text-secondary text-sm mt-1">
              {plan === 'BASIC' ? 'Mejora tu plan para crear ofertas' : 'Crea tu primera oferta y atrae más clientes'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {offers.map(o => {
            const active = isOfferActive(o)
            return (
              <div key={o.id} className={`bg-white rounded-xl border-2 p-5 ${active ? 'border-accent' : 'border-gray-soft opacity-70'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-primary">{o.title}</h3>
                    {o.description && <p className="text-xs text-secondary mt-0.5">{o.description}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="flex items-center gap-2 my-3">
                  <span className="text-3xl font-bold text-accent font-heading">
                    {o.discountPct ? `${o.discountPct}%` : formatCurrency(o.discountFixed || 0)}
                  </span>
                  <span className="text-secondary text-sm">de descuento</span>
                </div>

                <div className="space-y-1 text-xs text-secondary">
                  <p>📅 {formatDate(o.validFrom)} → {formatDate(o.validUntil)}</p>
                  {o.service && <p>✂️ Solo: {o.service.name}</p>}
                  {o.code && <p>🎫 Código: <span className="font-mono font-bold text-primary">{o.code}</span></p>}
                  <p>📊 Usos: {o.currentUses}{o.maxUses ? `/${o.maxUses}` : ' (ilimitado)'}</p>
                </div>

                {active && <div className="mt-3"><CountdownBadge until={o.validUntil} /></div>}

                {/* Usage bar */}
                {o.maxUses && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-soft rounded-full h-1.5">
                      <div className="bg-accent h-1.5 rounded-full" style={{ width: `${Math.min(100, (o.currentUses / o.maxUses) * 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={() => openEdit(o)}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(o)}>Eliminar</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Oferta' : 'Crear Oferta'}
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} loading={saving}>Guardar</Button></>}>
        <div className="space-y-4">
          <Input label="Título de la oferta" placeholder="Ej: 20% en cortes de temporada"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} error={errors.title} />

          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Tipo de descuento</label>
            <div className="flex gap-3">
              {[{ key: 'percent', label: '% Porcentaje' }, { key: 'fixed', label: 'COP Fijo' }].map(t => (
                <label key={t.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="discountType" value={t.key}
                    checked={form.discountType === t.key} onChange={() => setForm({ ...form, discountType: t.key })} />
                  <span className="text-sm">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {form.discountType === 'percent' ? (
            <Input label="Porcentaje de descuento (%)" type="number" min={1} max={100} placeholder="20"
              value={form.discountPct} onChange={e => setForm({ ...form, discountPct: e.target.value })} error={errors.discount} />
          ) : (
            <Input label="Descuento fijo (COP)" type="number" placeholder="5000"
              value={form.discountFixed} onChange={e => setForm({ ...form, discountFixed: e.target.value })} error={errors.discount} />
          )}

          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Servicio aplicable</label>
            <select value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })}
              className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm outline-none focus:border-accent">
              <option value="">Todos los servicios</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha inicio" type="date" value={form.validFrom}
              onChange={e => setForm({ ...form, validFrom: e.target.value })} error={errors.validFrom} />
            <Input label="Fecha fin" type="date" value={form.validUntil}
              onChange={e => setForm({ ...form, validUntil: e.target.value })} error={errors.validUntil} />
          </div>

          <Input label="Código promocional (opcional)" placeholder="VERANO2025"
            value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />

          <Input label="Máximo de usos (opcional)" type="number" placeholder="Dejar vacío = ilimitado"
            value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        message={`¿Eliminar la oferta "${confirmDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        confirmVariant="danger"
        onConfirm={() => deleteOffer(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
