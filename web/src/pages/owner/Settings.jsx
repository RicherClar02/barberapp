import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { formatCurrency } from '../../utils/formatters'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const PLANS = [
  { key: 'BASIC', label: 'Básico', price: 30000, features: ['1 barbero', '5 fotos', 'Sin ofertas'] },
  { key: 'STANDARD', label: 'Estándar', price: 60000, features: ['3 barberos', '20 fotos', '1 oferta activa'] },
  { key: 'PREMIUM', label: 'Premium', price: 120000, features: ['Ilimitado', 'Ilimitadas fotos', 'Ofertas ilimitadas', 'Anuncios'] },
]

export default function OwnerSettings() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('info')

  const { data: shopData } = useQuery({
    queryKey: ['my-barbershops'],
    queryFn: () => api.get('/api/barbershops/my').then(r => r.data),
  })
  const shop = shopData?.barbershops?.[0] || shopData?.[0]
  const shopId = shop?.id

  const { data: configData } = useQuery({
    queryKey: ['config', shopId],
    queryFn: () => api.get(`/api/config/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })
  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/api/subscriptions/my').then(r => r.data),
    enabled: !!shopId,
  })

  // Info general
  const [info, setInfo] = useState({ name: '', description: '', address: '', city: '', phone: '', instagram: '' })
  useEffect(() => { if (shop) setInfo({ name: shop.name || '', description: shop.description || '', address: shop.address || '', city: shop.city || '', phone: shop.phone || '', instagram: shop.instagram || '' }) }, [shop])

  const { mutate: saveInfo, isPending: savingInfo } = useMutation({
    mutationFn: () => api.put(`/api/barbershops/${shopId}`, info),
    onSuccess: () => { toast.success('Información guardada'); qc.invalidateQueries(['my-barbershops']) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  // Horarios
  const [schedules, setSchedules] = useState(
    DAYS.map((d, i) => ({ day: i + 1, dayName: d, isOpen: true, openTime: '08:00', closeTime: '18:00' }))
  )
  const { mutate: saveSchedules, isPending: savingSchedules } = useMutation({
    mutationFn: () => Promise.all(schedules.map(s => api.post('/api/schedules', { ...s, barbershopId: shopId }))),
    onSuccess: () => toast.success('Horarios guardados'),
    onError: () => toast.error('Error al guardar horarios'),
  })

  // Config financiera
  const [barberPct, setBarberPct] = useState(configData?.config?.barberPercentage || 60)
  const shopPct = 100 - barberPct
  const exampleCut = 25000
  const { mutate: saveConfig, isPending: savingConfig } = useMutation({
    mutationFn: () => api.put(`/api/config/${shopId}`, { barberPercentage: barberPct, shopPercentage: shopPct }),
    onSuccess: () => toast.success('Configuración guardada'),
    onError: () => toast.error('Error'),
  })

  // Fidelización
  const [loyaltyActive, setLoyaltyActive] = useState(configData?.config?.loyaltyEnabled ?? true)
  const [loyaltyVisits, setLoyaltyVisits] = useState(configData?.config?.loyaltyVisits || 10)

  const tabs = [
    { key: 'info', label: 'Información' },
    { key: 'schedules', label: 'Horarios' },
    { key: 'finance', label: 'Finanzas' },
    { key: 'loyalty', label: 'Fidelización' },
    { key: 'plan', label: 'Plan' },
  ]

  const sub = subData?.subscriptions?.[0]
  const daysLeft = sub ? Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0
  const progress = sub ? Math.max(0, Math.min(100, (daysLeft / 30) * 100)) : 0

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-soft p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${tab === t.key ? 'bg-primary text-white' : 'text-secondary hover:bg-cream'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Información general */}
      {tab === 'info' && (
        <Card title="Información general">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre de la barbería" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} />
            <Input label="Ciudad" value={info.city} onChange={e => setInfo({ ...info, city: e.target.value })} />
            <Input label="Dirección" value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} />
            <Input label="Teléfono" value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} />
            <Input label="Instagram" placeholder="@mibarberapp" value={info.instagram} onChange={e => setInfo({ ...info, instagram: e.target.value })} />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-secondary block mb-1">Descripción</label>
            <textarea className="w-full rounded-lg border border-gray-soft px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              rows={3} value={info.description} onChange={e => setInfo({ ...info, description: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => saveInfo()} loading={savingInfo}>Guardar información</Button>
          </div>
        </Card>
      )}

      {/* Horarios */}
      {tab === 'schedules' && (
        <Card title="Horarios de atención">
          <div className="space-y-3">
            {schedules.map((s, i) => (
              <div key={s.day} className="flex items-center gap-4 py-2 border-b border-gray-soft/50 last:border-0">
                <div className="w-24 flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={s.isOpen} onChange={e => setSchedules(prev => prev.map((x, j) => j === i ? { ...x, isOpen: e.target.checked } : x))} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-soft rounded-full peer peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4"></div>
                  </label>
                  <span className={`text-sm font-medium ${s.isOpen ? 'text-black-soft' : 'text-gray-400'}`}>{s.dayName}</span>
                </div>
                {s.isOpen && (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={s.openTime} onChange={e => setSchedules(prev => prev.map((x, j) => j === i ? { ...x, openTime: e.target.value } : x))}
                      className="rounded-lg border border-gray-soft px-2 py-1.5 text-sm outline-none focus:border-accent" />
                    <span className="text-secondary text-sm">→</span>
                    <input type="time" value={s.closeTime} onChange={e => setSchedules(prev => prev.map((x, j) => j === i ? { ...x, closeTime: e.target.value } : x))}
                      className="rounded-lg border border-gray-soft px-2 py-1.5 text-sm outline-none focus:border-accent" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => saveSchedules()} loading={savingSchedules}>Guardar horarios</Button>
          </div>
        </Card>
      )}

      {/* Finanzas */}
      {tab === 'finance' && (
        <Card title="Configuración financiera">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-secondary block mb-3">Porcentaje del barbero: <span className="text-primary font-bold">{barberPct}%</span></label>
              <input type="range" min={40} max={90} value={barberPct} onChange={e => setBarberPct(Number(e.target.value))}
                className="w-full accent-accent" />
              <div className="flex justify-between text-xs text-secondary mt-1"><span>40%</span><span>90%</span></div>
            </div>
            <div className="bg-cream rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-black-soft">Vista previa — corte de {formatCurrency(exampleCut)}:</p>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Barbero recibe:</span>
                <span className="font-semibold text-green-600">{formatCurrency(exampleCut * barberPct / 100)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Barbería recibe:</span>
                <span className="font-semibold text-primary">{formatCurrency(exampleCut * shopPct / 100)}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => saveConfig()} loading={savingConfig}>Guardar configuración</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Fidelización */}
      {tab === 'loyalty' && (
        <Card title="Programa de fidelización">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black-soft">Activar programa</p>
                <p className="text-sm text-secondary">Los clientes acumulan puntos por cada visita</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={loyaltyActive} onChange={e => setLoyaltyActive(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-soft rounded-full peer peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
            </div>
            {loyaltyActive && (
              <>
                <Input label="Corte gratis cada X visitas" type="number" min={1} max={50}
                  value={loyaltyVisits} onChange={e => setLoyaltyVisits(Number(e.target.value))} />
                <div className="bg-cream rounded-xl p-4">
                  <p className="text-sm text-secondary">
                    Cada <span className="font-bold text-primary">{loyaltyVisits}</span> cortes, el cliente obtiene <span className="font-bold text-accent">1 gratis</span>
                  </p>
                </div>
              </>
            )}
            <div className="flex justify-end">
              <Button onClick={() => toast.success('Configuración de fidelización guardada')}>Guardar</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Plan */}
      {tab === 'plan' && (
        <div className="space-y-4">
          {sub && (
            <Card title="Plan actual">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-2xl font-bold text-primary font-heading">{sub.plan}</span>
                  <p className="text-sm text-secondary mt-0.5">Vence el {new Date(sub.endDate).toLocaleDateString('es-CO')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {sub.status === 'ACTIVE' ? 'Activo' : 'Vencido'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-secondary">
                  <span>{daysLeft} días restantes</span><span>30 días</span>
                </div>
                <div className="w-full bg-gray-soft rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map(p => (
              <div key={p.key} className={`bg-white rounded-xl border-2 p-5 ${shop?.plan === p.key ? 'border-accent' : 'border-gray-soft'}`}>
                {shop?.plan === p.key && <p className="text-xs font-semibold text-accent mb-2">PLAN ACTUAL</p>}
                <h3 className="text-lg font-bold text-primary font-heading">{p.label}</h3>
                <p className="text-2xl font-bold text-accent mt-1">{formatCurrency(p.price)}<span className="text-sm font-normal text-secondary">/mes</span></p>
                <ul className="mt-3 space-y-1">
                  {p.features.map(f => <li key={f} className="text-sm text-secondary flex items-center gap-2"><span className="text-green-500">✓</span>{f}</li>)}
                </ul>
                {shop?.plan !== p.key && (
                  <Button className="w-full mt-4" size="sm" variant={p.key === 'PREMIUM' ? 'primary' : 'outline'}
                    onClick={() => toast('Integración Stripe próximamente', { icon: '💳' })}>
                    Cambiar a {p.label}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
