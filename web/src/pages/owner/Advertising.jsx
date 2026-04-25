import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, MousePointer, Video, Image } from 'lucide-react'
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
      qc.invalidateQueries(['ads', shopId])
      setModalOpen(false)
      setMediaFile(null)
      setMediaPreview(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al crear anuncio'),
  })

  const { mutate: updateAd } = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/api/ads/${id}`, data),
    onSuccess: () => { toast.success('Anuncio actualizado'); qc.invalidateQueries(['ads', shopId]) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
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
      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
        <span className="text-2xl">📢</span>
        <div>
          <p className="font-semibold text-primary">¿Cómo funciona la publicidad?</p>
          <p className="text-sm text-secondary mt-1">
            Tu anuncio aparecerá primero en la app con video o imagen, llegando a más clientes.
            Una vez creado, el equipo de BarberApp lo revisará y activará tras confirmar el pago.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={openAdd}><Plus size={16} /> Crear Anuncio</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-48 bg-gray-soft/30 rounded-xl animate-pulse" />)}
        </div>
      ) : ads.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <span className="text-5xl">📢</span>
            <p className="mt-3 font-semibold text-primary">Sin anuncios todavía</p>
            <p className="text-secondary text-sm mt-1">Crea tu primer anuncio para destacar entre la competencia</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ads.map(ad => (
            <div key={ad.id} className="bg-white rounded-xl border border-gray-soft overflow-hidden">
              {/* Media preview */}
              {ad.mediaUrl ? (
                ad.mediaType === 'video' ? (
                  <video src={ad.mediaUrl} className="w-full h-40 object-cover bg-black" controls muted />
                ) : (
                  <img src={ad.mediaUrl} alt={ad.title} className="w-full h-40 object-cover" />
                )
              ) : (
                <div className="w-full h-40 bg-cream flex items-center justify-center">
                  {ad.mediaType === 'video' ? <Video size={32} className="text-gray-soft" /> : <Image size={32} className="text-gray-soft" />}
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-primary">{ad.title}</h3>
                    {ad.description && <p className="text-xs text-secondary mt-0.5">{ad.description}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[ad.status] || 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[ad.status] || ad.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-secondary">
                  <span className="flex items-center gap-1"><Eye size={12} /> {ad.views || 0} vistas</span>
                  <span className="flex items-center gap-1"><MousePointer size={12} /> {ad.clicks || 0} clicks</span>
                  <span>{ad.mediaType === 'video' ? '🎥 Video' : '🖼 Imagen'}</span>
                </div>

                <p className="text-xs text-secondary">
                  📅 {formatDate(ad.validFrom)} → {formatDate(ad.validUntil)}
                </p>

                {ad.status === 'PENDING' && (
                  <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded-lg">
                    ⏳ Pendiente de revisión por el equipo de BarberApp
                  </p>
                )}

                {ad.status === 'REJECTED' && ad.rejectionReason && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                    ❌ Motivo de rechazo: {ad.rejectionReason}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  {ad.status !== 'EXPIRED' && (
                    <Button size="sm" variant="outline"
                      onClick={() => updateAd({ id: ad.id, isActive: false })}>
                      Pausar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
            📋 Una vez creado el anuncio, el equipo de BarberApp lo revisará y activará tras confirmar el pago.
          </div>

          <Input label="Título del anuncio" placeholder="Ej: ¡50% de descuento en tu primer corte!"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} error={errors.title} />

          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Descripción (opcional)</label>
            <textarea rows={2}
              className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm outline-none focus:border-accent resize-none"
              placeholder="Descripción del anuncio..." value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha inicio" type="date" value={form.validFrom}
              onChange={e => setForm({ ...form, validFrom: e.target.value })} error={errors.validFrom} />
            <Input label="Fecha fin" type="date" value={form.validUntil}
              onChange={e => setForm({ ...form, validUntil: e.target.value })} error={errors.validUntil} />
          </div>

          {/* Media upload */}
          <div>
            <label className="text-sm font-medium text-secondary block mb-2">Imagen o Video (hasta 50MB)</label>
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
                className="w-full h-32 border-2 border-dashed border-gray-soft rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent hover:bg-cream transition-colors cursor-pointer">
                <span className="text-2xl">📁</span>
                <span className="text-sm text-secondary">Haz clic para subir imagen o video</span>
                <span className="text-xs text-gray-400">JPG, PNG, MP4, MOV — max 50MB</span>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
