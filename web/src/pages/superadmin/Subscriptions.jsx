import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { SkeletonStat, SkeletonTable } from '../../components/ui/Skeleton'
import { formatDate, formatCurrency } from '../../utils/formatters'

const PLANS = ['BASIC', 'STANDARD', 'PREMIUM']

export default function SuperSubscriptions() {
  const qc = useQueryClient()
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [changePlanSub, setChangePlanSub] = useState(null)
  const [newPlan, setNewPlan] = useState('')
  const [cancelConfirm, setCancelConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', filterPlan, filterStatus, page],
    queryFn: () => {
      let url = `/api/subscriptions/all?page=${page}&limit=15`
      if (filterPlan) url += `&plan=${filterPlan}`
      if (filterStatus) url += `&status=${filterStatus}`
      return api.get(url).then(r => r.data)
    },
  })

  const subscriptions = data?.subscriptions || data || []
  const total = data?.total || subscriptions.length
  const summaryStats = data?.stats || {}

  const { mutate: updateSub, isPending: updating } = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/api/subscriptions/${id}`, body),
    onSuccess: () => {
      toast.success('Suscripción actualizada')
      qc.invalidateQueries(['admin-subscriptions'])
      setChangePlanSub(null)
      setCancelConfirm(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: activateSub, isPending: activating } = useMutation({
    mutationFn: (id) => api.put(`/api/subscriptions/${id}/activate`),
    onSuccess: () => { toast.success('Suscripción activada'); qc.invalidateQueries(['admin-subscriptions']) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const daysLeft = (endDate) => {
    const d = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    return Math.max(0, d)
  }

  const STAT_ITEMS = [
    { label: 'Activas', value: summaryStats.active || subscriptions.filter(s => s.status === 'ACTIVE').length, icon: '✅' },
    { label: 'Vencidas', value: summaryStats.expired || subscriptions.filter(s => s.status === 'EXPIRED').length, icon: '⚠️' },
    { label: 'Ingresos del mes', value: formatCurrency(summaryStats.monthlyRevenue || 0), icon: '💰' },
  ]

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading
          ? [1,2,3].map(i => <SkeletonStat key={i} />)
          : STAT_ITEMS.map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-soft p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{s.icon}</span>
                <p className="text-xs font-medium text-secondary uppercase">{s.label}</p>
              </div>
              <p className="text-2xl font-bold text-primary font-heading">{s.value}</p>
            </div>
          ))
        }
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-3 flex-wrap">
          <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-soft px-3 py-2 text-sm outline-none focus:border-accent">
            <option value="">Todos los planes</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-soft px-3 py-2 text-sm outline-none focus:border-accent">
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activa</option>
            <option value="EXPIRED">Vencida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </Card>

      <Card title={`Suscripciones — ${total}`}>
        {isLoading ? <SkeletonTable rows={8} cols={7} /> : subscriptions.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl">💳</span>
            <p className="mt-3 text-secondary">No hay suscripciones que coincidan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-soft">
                    {['Barbería', 'Plan', 'Estado', 'Inicio', 'Vencimiento', 'Días rest.', 'Monto', 'Acciones'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-secondary uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(s => {
                    const days = daysLeft(s.endDate)
                    return (
                      <tr key={s.id} className="border-b border-gray-soft/50 hover:bg-cream">
                        <td className="py-2.5 px-3 font-medium">{s.barbershop?.name || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s.plan}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-medium ${s.status === 'ACTIVE' ? 'text-green-600' : s.status === 'EXPIRED' ? 'text-red-500' : 'text-gray-400'}`}>
                            {s.status === 'ACTIVE' ? '● Activa' : s.status === 'EXPIRED' ? '● Vencida' : '● Cancelada'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-secondary text-xs">{formatDate(s.startDate)}</td>
                        <td className="py-2.5 px-3 text-secondary text-xs">{formatDate(s.endDate)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`font-semibold ${days <= 5 ? 'text-red-500' : days <= 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {s.status === 'ACTIVE' ? `${days}d` : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-accent">{formatCurrency(s.amount || 0)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1 flex-wrap">
                            {s.status !== 'ACTIVE' && (
                              <Button size="sm" variant="outline" onClick={() => activateSub(s.id)} loading={activating}>
                                Activar
                              </Button>
                            )}
                            <Button size="sm" variant="outline"
                              onClick={() => { setChangePlanSub(s); setNewPlan(s.plan) }}>
                              Plan
                            </Button>
                            {s.status === 'ACTIVE' && (
                              <Button size="sm" variant="danger" onClick={() => setCancelConfirm(s)}>
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-secondary">{total} suscripciones</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <span className="px-3 py-1 bg-cream rounded-lg font-medium">Pág {page}</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={subscriptions.length < 15}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Change Plan Modal */}
      <Modal open={!!changePlanSub} onClose={() => setChangePlanSub(null)} title="Cambiar plan"
        footer={<><Button variant="ghost" onClick={() => setChangePlanSub(null)}>Cancelar</Button><Button onClick={() => updateSub({ id: changePlanSub.id, plan: newPlan })} loading={updating}>Guardar</Button></>}>
        {changePlanSub && (
          <div className="space-y-3">
            <p className="text-sm text-secondary">Cambiar plan de <strong>{changePlanSub.barbershop?.name}</strong></p>
            <div className="flex flex-col gap-2">
              {PLANS.map(p => (
                <label key={p} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer ${newPlan === p ? 'border-accent bg-accent/5' : 'border-gray-soft'}`}>
                  <input type="radio" name="subplan" value={p} checked={newPlan === p} onChange={() => setNewPlan(p)} />
                  <span className="font-medium">{p}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancelConfirm}
        message={`¿Cancelar la suscripción de "${cancelConfirm?.barbershop?.name}"?`}
        confirmLabel="Sí, cancelar"
        confirmVariant="danger"
        onConfirm={() => updateSub({ id: cancelConfirm.id, status: 'CANCELLED' })}
        onCancel={() => setCancelConfirm(null)}
        loading={updating}
      />
    </div>
  )
}
