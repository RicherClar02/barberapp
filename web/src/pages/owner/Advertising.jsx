import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, MousePointer, Video, Image, Calendar, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { formatDate } from '../../utils/formatters'

const STATUS_STYLES = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-100 text-red-600',
}

const STATUS_LABELS = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente de aprobación',
  EXPIRED: 'Vencido',
  REJECTED: 'Rechazado',
}

export default function OwnerAdvertising() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [uploadingFor, setUploadingFor] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', validFrom: '', validUntil: '' })
  const [errors, setErrors] = useState({})
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const fileInputRef = useRef()

  const { data: shopData } = useQuery({
    queryKey: ['my-barbershops'],
    queryFn: () => api.get('/api/barbershops/my').then(r => r.data),
  })
  const shop = shopData?.barbershops?.[0] || shopData?.[0]
  const shopId = shop?.id

  const { data: adsData, isLoading } = useQuery({
    queryKey: ['ads', shopId],
    queryFn: () => api.get(`/api/ads/shop/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const ads = adsData?.ads || adsData || []

  const { mutate: createAd, isPending: creating } = useMutation({
    mutationFn: (data) => api.post('/api/ads', data),
    onSuccess: async (res) => {
      const adId = res.data?.ad?.id || res.data?.id
      if (adId && mediaFile) {
        setUploadingFor(adId)
        const fd = new FormData()
        fd.append('file', mediaFile)
        try {
          await api.post(`/api/upload/ad-media/${adId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          toast.success('Anuncio creado — pendiente de aprobación')
        } catch {
          toast.success('Anuncio creado. Error al subir media, intenta de nuevo.')
        }
        setUploadingFor(null)
      } else {
        toast.success('Anuncio creado — pendiente de aprobación')
      }
      qc.invalidateQueries({ queryKey: ['ads', shopId] })
      setModalOpen(false)
      setMediaFile(null)
      setMediaPreview(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al crear anuncio'),
  })

  const validate = () => {
    const e = {}
    if (!form.title) e.title = 'Título requerido'
    if (!form.validFrom) e.validFrom = 'Fecha inicio requerida'
    if (!form.validUntil) e.validUntil = 'Fecha fin requerida'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    createAd({ ...form, barbershopId: shopId })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { toast.error('El archivo no puede superar 50MB'); return }
    setMediaFile(file)
    const url = URL.createObjectURL(file)
    setMediaPreview({ url, type: file.type.startsWith('video') ? 'video' : 'image' })
  }

  const openAdd = () => {
    setForm({ title: '', description: '', validFrom: '', validUntil: '' })
    setErrors({})
    setMediaFile(null)
    setMediaPreview(null)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary font-heading">Publicidad</h2>
          <p className="text-sm text-muted">Tu anuncio aparece primero en la búsqueda</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
        >
          <Plus size={16} /> + Crear Anuncio
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          El equipo ESTILO revisará tu anuncio antes de publicarlo para asegurar que cumple con nuestras políticas.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-56 bg-cream rounded-xl animate-pulse" />)}
        </div>
      ) : ads.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Create card placeholder */}
          <button
            onClick={openAdd}
            className="bg-white rounded-xl border-2 border-dashed border-[rgba(74,44,10,0.15)] h-56 flex flex-col items-center justify-center gap-3 hover:border-accent hover:bg-cream transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center">
              <Plus size={24} className="text-accent" />
            </div>
            <span className="text-sm font-medium text-muted">Crear Nuevo Anuncio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ads.map(ad => (
            <div key={ad.id} className="bg-white rounded-xl shadow-card overflow-hidden">
              {/* Preview area */}
              {ad.mediaUrl ? (
                ad.mediaType === 'video'
                  ? <video src={ad.mediaUrl} className="w-full h-44 object-cover bg-black" controls muted />
                  : <img src={ad.mediaUrl} alt={ad.title} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 bg-cream flex items-center justify-center">
                  <p className="text-sm text-muted font-medium">Vista previa del anuncio</p>
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-primary">{ad.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${STATUS_STYLES[ad.status] || 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[ad.status] || ad.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-cream rounded-lg p-2.5 flex items-center gap-2">
                    <Eye size={14} className="text-muted" />
                    <div>
                      <p className="text-xs text-muted">Vistas</p>
                      <p className="text-sm font-bold text-primary">{ad.views || 0}</p>
                    </div>
                  </div>
                  <div className="bg-cream rounded-lg p-2.5 flex items-center gap-2">
                    <MousePointer size={14} className="text-muted" />
                    <div>
                      <p className="text-xs text-muted">Clicks</p>
                      <p className="text-sm font-bold text-primary">{ad.clicks || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Calendar size={12} />
                  <span>{formatDate(ad.validFrom)} → {formatDate(ad.validUntil)}</span>
                </div>

                {ad.status === 'PENDING' && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded-lg">
                    ⏳ Pendiente de revisión por el equipo de ESTILO
                  </p>
                )}
                {ad.status === 'REJECTED' && ad.rejectionReason && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">
                    ❌ {ad.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Add more */}
          <button
            onClick={openAdd}
            className="bg-white rounded-xl border-2 border-dashed border-[rgba(74,44,10,0.15)] h-56 flex flex-col items-center justify-center gap-3 hover:border-accent hover:bg-cream transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center">
              <Plus size={24} className="text-accent" />
            </div>
            <span className="text-sm font-medium text-muted">Crear Nuevo Anuncio</span>
          </button>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Crear Anuncio"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={creating || !!uploadingFor}>
              {uploadingFor ? 'Subiendo media...' : 'Crear anuncio'}
            </Button>
          </>
        }>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            📋 Una vez creado, el equipo de ESTILO lo revisará y activará tras confirmar el pago.
          </div>

          <Input label="Título del anuncio" placeholder="Ej: ¡50% de descuento en tu primer corte!"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} error={errors.title} />

          <div>
            <label className="text-sm font-medium text-muted block mb-1">Descripción (opcional)</label>
            <textarea rows={2}
              className="w-full rounded-lg border border-[rgba(74,44,10,0.1)] px-3 py-2.5 text-sm outline-none focus:border-accent resize-none bg-white"
              placeholder="Descripción del anuncio..." value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha inicio" type="date" value={form.validFrom}
              onChange={e => setForm({ ...form, validFrom: e.target.value })} error={errors.validFrom} />
            <Input label="Fecha fin" type="date" value={form.validUntil}
              onChange={e => setForm({ ...form, validUntil: e.target.value })} error={errors.validUntil} />
          </div>

          <div>
            <label className="text-sm font-medium text-muted block mb-2">Imagen o Video (hasta 50MB)</label>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
            {mediaPreview ? (
              <div className="relative">
                {mediaPreview.type === 'video'
                  ? <video src={mediaPreview.url} className="w-full h-40 object-cover rounded-lg" controls muted />
                  : <img src={mediaPreview.url} alt="preview" className="w-full h-40 object-cover rounded-lg" />}
                <button onClick={() => { setMediaFile(null); setMediaPreview(null) }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer">✕</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-[rgba(74,44,10,0.15)] rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent hover:bg-cream transition-colors cursor-pointer">
                <span className="text-2xl">📁</span>
                <span className="text-sm text-muted">Haz clic para subir imagen o video</span>
                <span className="text-xs text-gray-400">JPG, PNG, MP4 — max 50MB</span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
