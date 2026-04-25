import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, MousePointer } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { formatDate } from '../../utils/formatters'

const STATUS_STYLES = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-100 text-red-600',
}

export default function SuperAdvertising() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [previewAd, setPreviewAd] = useState(null)
  const [approveAd, setApproveAd] = useState(null)
  const [rejectAd, setRejectAd] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deactivateConfirm, setDeactivateConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ads', filterStatus, page],
    queryFn: () => {
      let url = `/api/ads?page=${page}&limit=15`
      if (filterStatus) url += `&status=${filterStatus}`
      return api.get(url).then(r => r.data)
    },
  })

  const ads = data?.ads || data || []
  const total = data?.total || ads.length

  const { mutate: activateAd, isPending: activating } = useMutation({
    mutationFn: ({ id, amount }) => api.put(`/api/ads/${id}/activate`, { amount }),
    onSuccess: () => {
      toast.success('Anuncio activado')
      qc.invalidateQueries(['admin-ads'])
      setApproveAd(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: rejectAdMutation, isPending: rejecting } = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/api/ads/${id}`, { status: 'REJECTED', rejectionReason: reason }),
    onSuccess: () => {
      toast.success('Anuncio rechazado')
      qc.invalidateQueries(['admin-ads'])
      setRejectAd(null)
      setRejectReason('')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: deactivateAd, isPending: deactivating } = useMutation({
    mutationFn: (id) => api.put(`/api/ads/${id}`, { status: 'EXPIRED', isActive: false }),
    onSuccess: () => {
      toast.success('Anuncio desactivado')
      qc.invalidateQueries(['admin-ads'])
      setDeactivateConfirm(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const [approveAmount, setApproveAmount] = useState('')

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-soft px-3 py-2 text-sm outline-none focus:border-accent">
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente aprobación</option>
          <option value="ACTIVE">Activos</option>
          <option value="EXPIRED">Vencidos</option>
          <option value="REJECTED">Rechazados</option>
        </select>
      </Card>

      <Card title={`Anuncios — ${total}`}>
        {isLoading ? <SkeletonTable rows={6} cols={6} /> : ads.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl">📢</span>
            <p className="mt-3 text-secondary">No hay anuncios que coincidan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-soft">
                    {['Preview', 'Barbería', 'Título', 'Tipo', 'Fechas', 'Stats', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-secondary uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ads.map(ad => (
                    <tr key={ad.id} className="border-b border-gray-soft/50 hover:bg-cream">
                      <td className="py-2.5 px-3">
                        {ad.mediaUrl ? (
                          <button onClick={() => setPreviewAd(ad)} className="cursor-pointer">
                            {ad.mediaType === 'video'
                              ? <div className="w-14 h-10 bg-black rounded flex items-center justify-center text-white text-xs">▶ Video</div>
                              : <img src={ad.mediaUrl} alt="" className="w-14 h-10 object-cover rounded" />
                            }
                          </button>
                        ) : <div className="w-14 h-10 bg-cream rounded flex items-center justify-center text-xl">📢</div>}
                      </td>
                      <td className="py-2.5 px-3 font-medium">{ad.barbershop?.name || '—'}</td>
                      <td className="py-2.5 px-3">{ad.title}</td>
                      <td className="py-2.5 px-3 text-xs text-secondary">{ad.mediaType || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-secondary">
                        <p>{formatDate(ad.validFrom)}</p>
                        <p>→ {formatDate(ad.validUntil)}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-xs text-secondary space-y-0.5">
                          <p className="flex items-center gap-1"><Eye size={10} /> {ad.views || 0}</p>
                          <p className="flex items-center gap-1"><MousePointer size={10} /> {ad.clicks || 0}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[ad.status] || 'bg-gray-100'}`}>
                          {ad.status === 'PENDING' ? 'Pendiente' : ad.status === 'ACTIVE' ? 'Activo' : ad.status === 'EXPIRED' ? 'Vencido' : 'Rechazado'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1 flex-wrap">
                          {ad.status === 'PENDING' && (
                            <>
                              <Button size="sm" onClick={() => { setApproveAd(ad); setApproveAmount('') }}>Aprobar</Button>
                              <Button size="sm" variant="danger" onClick={() => { setRejectAd(ad); setRejectReason('') }}>Rechazar</Button>
                            </>
                          )}
                          {ad.status === 'ACTIVE' && (
                            <Button size="sm" variant="outline" onClick={() => setDeactivateConfirm(ad)}>Desactivar</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-secondary">{total} anuncios</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <span className="px-3 py-1 bg-cream rounded-lg font-medium">Pág {page}</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={ads.length < 15}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Preview Modal */}
      <Modal open={!!previewAd} onClose={() => setPreviewAd(null)} title={previewAd?.title}>
        {previewAd && (
          <div>
            {previewAd.mediaType === 'video'
              ? <video src={previewAd.mediaUrl} className="w-full rounded-lg" controls />
              : <img src={previewAd.mediaUrl} alt="" className="w-full rounded-lg" />
            }
            <div className="mt-3 text-sm text-secondary">
              <p>Barbería: <strong>{previewAd.barbershop?.name}</strong></p>
              <p>Vigencia: {formatDate(previewAd.validFrom)} → {formatDate(previewAd.validUntil)}</p>
              {previewAd.description && <p className="mt-1">{previewAd.description}</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal open={!!approveAd} onClose={() => setApproveAd(null)} title="Aprobar anuncio"
        footer={<><Button variant="ghost" onClick={() => setApproveAd(null)}>Cancelar</Button><Button onClick={() => activateAd({ id: approveAd.id, amount: parseFloat(approveAmount) || 0 })} loading={activating}>Activar anuncio</Button></>}>
        {approveAd && (
          <div className="space-y-3">
            <p className="text-sm text-secondary">Activar anuncio de <strong>{approveAd.barbershop?.name}</strong></p>
            <Input label="Monto pagado (COP)" type="number" placeholder="0"
              value={approveAmount} onChange={e => setApproveAmount(e.target.value)} />
            <p className="text-xs text-secondary bg-cream p-2 rounded-lg">
              Al aprobar, el anuncio quedará visible de inmediato en la app.
            </p>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectAd} onClose={() => setRejectAd(null)} title="Rechazar anuncio"
        footer={<><Button variant="ghost" onClick={() => setRejectAd(null)}>Cancelar</Button><Button variant="danger" onClick={() => rejectAdMutation({ id: rejectAd.id, reason: rejectReason })} loading={rejecting}>Rechazar</Button></>}>
        {rejectAd && (
          <div className="space-y-3">
            <p className="text-sm text-secondary">Rechazar anuncio de <strong>{rejectAd.barbershop?.name}</strong></p>
            <div>
              <label className="text-sm font-medium text-secondary block mb-1">Motivo de rechazo</label>
              <textarea rows={3} className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm outline-none focus:border-accent resize-none"
                placeholder="Explica el motivo del rechazo..."
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deactivateConfirm}
        message={`¿Desactivar el anuncio "${deactivateConfirm?.title}"?`}
        confirmLabel="Sí, desactivar"
        confirmVariant="danger"
        onConfirm={() => deactivateAd(deactivateConfirm.id)}
        onCancel={() => setDeactivateConfirm(null)}
        loading={deactivating}
      />
    </div>
  )
}
