import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag, Clock, Trash2, Edit2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate, toDisplayDate, endOfLocalDay } from '../../utils/formatters'

function useCountdown(until) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const tick = () => {
      // validUntil es un día de calendario: la oferta vence al final de ese
      // día en hora local, no en su medianoche UTC.
      const diff = endOfLocalDay(until) - new Date()
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
    mutationFn: (data) => editing ? api.put(`/api/offers/${editing.id}`, data) : api.post('/api/offers', data),
    onSuccess: () => {
      toast.success(editing ? 'Oferta actualizada' : 'Oferta creada')
      qc.invalidateQueries({ queryKey: ['offers', shopId] })
      setModalOpen(false)
      setEditing(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: deleteOffer, isPending: deleting } = useMutation({
    mutationFn: (id) => api.delete(`/api/offers/${id}`),
    onSuccess: () => { toast.success('Oferta eliminada'); qc.invalidateQueries({ queryKey: ['offers', shopId] }); setConfirmDelete(null) },
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

  // validFrom y validUntil son días de calendario guardados como medianoche
  // UTC. Comparándolos crudos, en Bogotá la oferta arrancaba 5h antes (7pm del
  // día anterior) y moría 29h antes (7pm de la víspera del último día). Vale
  // desde el arranque del primer día hasta el final del último, en hora local.
  const isOfferActive = (o) => {
    const now = new Date()
    return o.isActive && toDisplayDate(o.validFrom) <= now && endOfLocalDay(o.validUntil) >= now
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary font-heading">Ofertas y Promociones</h2>
          <p className="text-sm text-muted">Crea promociones para atraer más clientes</p>
        </div>
        <button
          onClick={openAdd}
          disabled={plan === 'BASIC' || (plan === 'STANDARD' && activeOffers.length >= 1)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> + Crear Oferta
        </button>
      </div>

      {/* Plan restriction */}
      {plan === 'BASIC' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag size={18} className="text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Las ofertas están disponibles desde el plan Estándar</p>
              <p className="text-xs text-amber-600">Mejora tu plan para atraer más clientes con descuentos</p>
            </div>
          </div>
          <button onClick={() => window.location.href = '/owner/settings'}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors">
            Mejorar plan
          </button>
        </div>
      )}
      {plan === 'STANDARD' && activeOffers.length >= 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
          <Tag size={15} />
          <span>Plan Estándar: tienes 1 oferta activa. Desactívala para crear una nueva.</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-cream rounded-xl animate-pulse" />)}
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Tag size={40} className="text-gray-soft mx-auto mb-3" />
          <p className="font-semibold text-primary">No hay ofertas creadas</p>
          <p className="text-muted text-sm mt-1">
            {plan === 'BASIC' ? 'Mejora tu plan para crear ofertas' : 'Crea tu primera oferta y atrae más clientes'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {offers.map(o => {
            const active = isOfferActive(o)
            const countdown = active ? o.validUntil : null
            return (
              <div key={o.id} className={`bg-white rounded-xl shadow-card p-5 ${!active ? 'opacity-70' : ''}`}>
                {/* Title + badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-primary truncate">{o.title}</h3>
                    {o.description && <p className="text-xs text-muted mt-0.5">{o.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-lg font-bold text-accent">
                      {o.discountPct ? `${o.discountPct}%` : formatCurrency(o.discountFixed || 0)}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>

                {/* Date card */}
                <div className="bg-cream rounded-lg p-3 mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-muted flex-shrink-0" />
                  <span className="text-xs text-muted">{formatDate(o.validFrom)} → {formatDate(o.validUntil)}</span>
                </div>

                {o.code && (
                  <p className="text-xs text-muted mb-2">
                    🎫 Código: <span className="font-mono font-bold text-primary">{o.code}</span>
                    {' '}· Usos: {o.currentUses}{o.maxUses ? `/${o.maxUses}` : ''}
                  </p>
                )}

                {active && countdown && (
                  <CountdownBadge until={countdown} />
                )}

                {o.maxUses && (
                  <div className="mt-2 mb-3">
                    <div className="w-full bg-gray-soft rounded-full h-1.5">
                      <div className="bg-accent h-1.5 rounded-full" style={{ width: `${Math.min(100, (o.currentUses / o.maxUses) * 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-[rgba(74,44,10,0.06)]">
                  <button onClick={() => openEdit(o)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-[rgba(74,44,10,0.15)] text-primary rounded-lg hover:bg-cream transition-colors">
                    <Edit2 size={12} /> Editar
                  </button>
                  <button onClick={() => setConfirmDelete(o)}
                    className="flex items-center justify-center px-3 py-2 text-xs font-medium border border-red-200 text-destructive rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={12} />
                  </button>
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
            <label className="text-sm font-medium text-muted block mb-2">Tipo de descuento</label>
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
            <Input label="Porcentaje (%)" type="number" min={1} max={100} placeholder="20"
              value={form.discountPct} onChange={e => setForm({ ...form, discountPct: e.target.value })} error={errors.discount} />
          ) : (
            <Input label="Descuento fijo (COP)" type="number" placeholder="5000"
              value={form.discountFixed} onChange={e => setForm({ ...form, discountFixed: e.target.value })} error={errors.discount} />
          )}
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Servicio aplicable</label>
            <select value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })}
              className="w-full rounded-lg border border-[rgba(74,44,10,0.1)] px-3 py-2.5 text-sm outline-none focus:border-accent bg-white">
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

function CountdownBadge({ until }) {
  const remaining = useCountdown(until)
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full mb-2">
      <Clock size={11} /> {remaining}
    </span>
  )
}
