export default function Input({ label, error, icon, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium text-secondary">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">{icon}</span>}
        <input
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-black-soft bg-white placeholder-gray-400 outline-none transition-all
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-soft focus:border-accent focus:ring-1 focus:ring-accent'}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
