export default function StatCard({ icon, title, value, subtitle, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-soft p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-secondary font-medium">{title}</p>
          <p className="text-2xl font-bold text-black-soft font-heading mt-1">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 font-medium ${trendUp ? 'text-green-600' : trendUp === false ? 'text-red-500' : 'text-gray-400'}`}>
              {trend && (trendUp ? '▲' : '▼')} {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 bg-cream rounded-lg text-2xl">{icon}</div>
        )}
      </div>
    </div>
  )
}
