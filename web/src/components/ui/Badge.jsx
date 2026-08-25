const STATUS_MAP = {
  PENDING:     { bg: '#FEF9C3', text: '#854D0E', label: 'Pendiente' },
  CONFIRMED:   { bg: '#DBEAFE', text: '#1E40AF', label: 'Confirmada' },
  COMPLETED:   { bg: '#DCFCE7', text: '#166534', label: 'Completada' },
  CANCELLED:   { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelada' },
  NO_SHOW:     { bg: '#F3F4F6', text: '#374151', label: 'No se presentó' },
  IN_PROGRESS: { bg: '#EDE9FE', text: '#5B21B6', label: 'En curso' },
  ACTIVE:      { bg: '#DCFCE7', text: '#166534', label: 'Activo' },
  REFUNDED:    { bg: '#F3F4F6', text: '#374151', label: 'Reembolsado' },
  REFUND_PENDING: { bg: '#FEF9C3', text: '#854D0E', label: 'Reembolso pendiente' },
}

const PLAN_MAP = {
  PREMIUM:  { bg: '#FDF0E0', text: '#8B5E0A', label: 'Premium 👑' },
  STANDARD: { bg: '#F5EFE6', text: '#4A2C0A', label: 'Estándar' },
  BASIC:    { bg: '#F3F4F6', text: '#6B7280', label: 'Básico' },
}

export default function Badge({ status, plan, label, className = '' }) {
  const map = plan ? PLAN_MAP[plan] : STATUS_MAP[status]
  const displayLabel = label || map?.label || status || plan

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${className}`}
      style={{ backgroundColor: map?.bg || '#F3F4F6', color: map?.text || '#374151' }}
    >
      {displayLabel}
    </span>
  )
}
