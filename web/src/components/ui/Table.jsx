import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 10

export default function Table({ columns, data, loading, emptyMessage = 'No hay datos disponibles' }) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil((data?.length || 0) / PAGE_SIZE)
  const paginated = data?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) || []

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-soft">
        <table className="w-full text-sm">
          <thead className="bg-cream">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-semibold text-secondary font-heading text-xs uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-soft">
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-secondary">Cargando...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-secondary">{emptyMessage}</td></tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-cream transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-black-soft">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs text-secondary">{data.length} registros</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-cream disabled:opacity-40 cursor-pointer">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-cream disabled:opacity-40 cursor-pointer">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
