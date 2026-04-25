import { getStatusColor, getStatusLabel } from '../../utils/formatters'

export default function Badge({ status, label, className = '' }) {
  const colorClass = getStatusColor(status)
  const text = label || getStatusLabel(status)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {text}
    </span>
  )
}
