export default function Card({ children, className = '', title, action }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-soft p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-black-soft font-heading">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
