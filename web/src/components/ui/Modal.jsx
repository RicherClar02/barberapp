import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col z-10">
        <div className="flex items-center justify-between p-5 border-b border-gray-soft">
          <h2 className="text-lg font-semibold text-black-soft font-heading">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-cream text-secondary cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-5 border-t border-gray-soft flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}
