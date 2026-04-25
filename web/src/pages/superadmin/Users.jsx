import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { formatDate } from '../../utils/formatters'

const ROLES = ['CLIENT', 'OWNER', 'BARBER', 'ADMIN']

const ROLE_STYLES = {
  ADMIN: 'bg-red-100 text-red-700',
  OWNER: 'bg-purple-100 text-purple-700',
  BARBER: 'bg-blue-100 text-blue-700',
  CLIENT: 'bg-green-100 text-green-700',
}

export default function SuperUsers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [toggleConfirm, setToggleConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, filterRole, page],
    queryFn: () => {
      let url = `/api/auth/users?page=${page}&limit=20`
      if (search) url += `&search=${encodeURIComponent(search)}`
      if (filterRole) url += `&role=${filterRole}`
      return api.get(url).then(r => r.data)
    },
  })

  const users = data?.users || data || []
  const total = data?.total || users.length

  const { mutate: toggleUser, isPending: toggling } = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/api/auth/users/${id}`, { isActive: !isActive }),
    onSuccess: () => {
      toast.success('Usuario actualizado')
      qc.invalidateQueries(['admin-users'])
      setToggleConfirm(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-soft text-sm outline-none focus:border-accent" />
          </div>
          <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-soft px-3 py-2 text-sm outline-none focus:border-accent">
            <option value="">Todos los roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </Card>

      <Card title={`Usuarios — ${total} registrados`}>
        {isLoading ? <SkeletonTable rows={10} cols={5} /> : users.length === 0 ? (
          <div className="text-center py-10">
            <span className="text-4xl">👥</span>
            <p className="mt-3 text-secondary">No hay usuarios que coincidan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-soft">
                    {['Nombre', 'Email', 'Rol', 'Registro', 'Estado', 'Acción'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-secondary uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-soft/50 hover:bg-cream">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-secondary">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-secondary text-xs">{formatDate(u.createdAt)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs font-medium ${u.isActive !== false ? 'text-green-600' : 'text-red-500'}`}>
                          {u.isActive !== false ? '● Activo' : '● Inactivo'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Button size="sm" variant={u.isActive !== false ? 'danger' : 'secondary'}
                          onClick={() => setToggleConfirm(u)}>
                          {u.isActive !== false ? 'Desactivar' : 'Activar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-secondary">{total} usuarios en total</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <span className="px-3 py-1 bg-cream rounded-lg font-medium">Pág {page}</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={users.length < 20}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!toggleConfirm}
        message={`¿${toggleConfirm?.isActive !== false ? 'Desactivar' : 'Activar'} al usuario "${toggleConfirm?.name}"?`}
        confirmLabel="Confirmar"
        confirmVariant={toggleConfirm?.isActive !== false ? 'danger' : 'primary'}
        onConfirm={() => toggleUser({ id: toggleConfirm.id, isActive: toggleConfirm.isActive !== false })}
        onCancel={() => setToggleConfirm(null)}
        loading={toggling}
      />
    </div>
  )
}
