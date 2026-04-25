import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { formatDate } from '../../utils/formatters'

const PLANS = ['BASIC', 'STANDARD', 'PREMIUM']

export default function SuperBarbershops() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [detailShop, setDetailShop] = useState(null)
  const [changePlanShop, setChangePlanShop] = useState(null)
  const [newPlan, setNewPlan] = useState('')
  const [toggleConfirm, setToggleConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-barbershops', search, filterPlan, filterStatus, page],
    queryFn: () => {
      let url = `/api/barbershops?page=${page}&limit=15`
      if (search) url += `&search=${encodeURIComponent(search)}`
      if (filterPlan) url += `&plan=${filterPlan}`
      if (filterStatus !== '') url += `&isActive=${filterStatus}`
      return api.get(url).then(r => r.data)
    },
  })

  const barbershops = data?.barbershops || data || []
  const total = data?.total || barbershops.length

  const { mutate: updateShop, isPending: updating } = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/api/barbershops/${id}`, body),
    onSuccess: () => {
      toast.success('Barbería actualizada')
      qc.invalidateQueries(['admin-barbershops'])
      setChangePlanShop(null)
      setToggleConfirm(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const handleChangePlan = () => {
    if (!newPlan) return
    updateShop({ id: changePlanShop.id, plan: newPlan })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nombre o ciudad..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-soft text-sm outline-none focus:border-accent" />
          </div>
          <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-soft px-3 py-2 text-sm outline-none focus:border-accent">
            <option value="">Todos los planes</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-soft px-3 py-2 text-sm outline-none focus:border-accent">
            <option value="">Todos los estados</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>
      </Card>

      <Card title={`Barberías — ${total} registradas`}>
        {isLoading ? <SkeletonTable rows={8} cols={7} /> : barbershops.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl">🏪</span>
            <p className="mt-3 text-secondary">No hay barberías que coincidan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-soft">
                    {['Nombre', 'Ciudad', 'Dueño', 'Plan', 'Estado', 'Registro', 'Acciones'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-secondary uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {barbershops.map(b => (
                    <tr key={b.id} className="border-b border-gray-soft/50 hover:bg-cream">
                      <td className="py-2.5 px-3 font-medium">{b.name}</td>
                      <td className="py-2.5 px-3 text-secondary">{b.city || '—'}</td>
                      <td className="py-2.5 px-3">{b.owner?.name || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{b.plan}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-medium ${b.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                          {b.isActive !== false ? '● Activa' : '● Inactiva'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-secondary text-xs">{formatDate(b.createdAt)}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => setDetailShop(b)}>Ver</Button>
                          <Button size="sm" variant="outline" onClick={() => { setChangePlanShop(b); setNewPlan(b.plan) }}>Plan</Button>
                          <Button size="sm" variant={b.isActive !== false ? 'danger' : 'secondary'}
                            onClick={() => setToggleConfirm(b)}>
                            {b.isActive !== false ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-secondary">{total} barberías en total</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <span className="px-3 py-1 bg-cream rounded-lg font-medium">Pág {page}</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={barbershops.length < 15}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal open={!!detailShop} onClose={() => setDetailShop(null)} title="Detalle de barbería">
        {detailShop && (
          <div className="space-y-4">
            {detailShop.logo && <img src={detailShop.logo} alt="" className="w-full h-40 object-cover rounded-lg" />}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Nombre', detailShop.name],
                ['Ciudad', detailShop.city],
                ['Dirección', detailShop.address],
                ['Teléfono', detailShop.phone],
                ['Plan', detailShop.plan],
                ['Instagram', detailShop.instagram],
                ['Dueño', detailShop.owner?.name],
                ['Email dueño', detailShop.owner?.email],
              ].map(([label, val]) => val ? (
                <div key={label} className="bg-cream rounded-lg p-2">
                  <p className="text-secondary text-xs">{label}</p>
                  <p className="font-medium">{val}</p>
                </div>
              ) : null)}
            </div>
            {detailShop.description && (
              <div className="bg-cream rounded-lg p-3">
                <p className="text-secondary text-xs mb-1">Descripción</p>
                <p className="text-sm">{detailShop.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Change Plan Modal */}
      <Modal open={!!changePlanShop} onClose={() => setChangePlanShop(null)} title="Cambiar plan"
        footer={<><Button variant="ghost" onClick={() => setChangePlanShop(null)}>Cancelar</Button><Button onClick={handleChangePlan} loading={updating}>Guardar</Button></>}>
        {changePlanShop && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">Cambiar plan de <strong>{changePlanShop.name}</strong></p>
            <div className="flex flex-col gap-2">
              {PLANS.map(p => (
                <label key={p} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${newPlan === p ? 'border-accent bg-accent/5' : 'border-gray-soft'}`}>
                  <input type="radio" name="plan" value={p} checked={newPlan === p} onChange={() => setNewPlan(p)} />
                  <span className="font-medium">{p}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Toggle Confirm */}
      <ConfirmDialog
        open={!!toggleConfirm}
        message={`¿${toggleConfirm?.isActive !== false ? 'Desactivar' : 'Activar'} la barbería "${toggleConfirm?.name}"?`}
        confirmLabel="Confirmar"
        confirmVariant={toggleConfirm?.isActive !== false ? 'danger' : 'primary'}
        onConfirm={() => updateShop({ id: toggleConfirm.id, isActive: toggleConfirm.isActive === false })}
        onCancel={() => setToggleConfirm(null)}
        loading={updating}
      />
    </div>
  )
}
