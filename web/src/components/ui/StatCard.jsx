import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({ icon, title, value, subtitle, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl shadow-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center text-xl flex-shrink-0">
          {icon}
        </div>
        {trendUp !== undefined && trend && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-success' : 'text-destructive'}`}>
            {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-primary font-heading">{value}</p>
        <p className="text-xs text-muted mt-0.5">{title}</p>
        {subtitle && !trend && <p className="text-xs text-muted/70 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
