import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import ImageUploader from '../../components/ui/ImageUploader'
import { formatCurrency, toDisplayDate } from '../../utils/formatters'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// El backend numera los días 0-6 con domingo=0 (schedule.service.js valida ese
// rango, y es la convención de Date.getUTCDay() que usa getAvailability).
// La lista de arriba se muestra empezando por lunes, así que el índice visual
// no coincide con dayOfWeek: la posición 6 (Domingo) es el día 0.
const DAY_OF_WEEK = [1, 2, 3, 4, 5, 6, 0]
const PLANS = [
  { key: 'BASIC', label: 'Básico', price: 30000, features: ['2 barberos', '5 fotos', 'Sin ofertas'] },
  { key: 'STANDARD', label: 'Estándar', price: 60000, features: ['4 barberos', '20 fotos', '1 oferta activa'] },
  { key: 'PREMIUM', label: 'Premium', price: 120000, features: ['Barberos ilimitados', 'Fotos ilimitadas', 'Ofertas ilimitadas', 'Anuncios'] },
]

const TABS = [
  { key: 'info', label: 'Info' },
  { key: 'schedules', label: 'Horarios' },
  { key: 'finance', label: 'Porcentajes' },
  { key: 'loyalty', label: 'Fidelización' },
  { key: 'gallery', label: 'Galería' },
  { key: 'plan', label: 'Suscripción' },
]

function GalleryTab({ shopId }) {
  const qc = useQueryClient()

  const { data: photosData, isLoading } = useQuery({
    queryKey: ['shop-photos', shopId],
    queryFn: () => api.get(`/api/barbershops/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })
  const photos = photosData?.barbershop?.photos || photosData?.photos || []

  const { mutate: deletePhoto, isPending: deleting } = useMutation({
    mutationFn: (photoId) => api.delete(`/api/upload/barbershop-photo/${photoId}`),
    onSuccess: () => { toast.success('Foto eliminada'); qc.invalidateQueries({ queryKey: ['shop-photos', shopId] }) },
    onError: () => toast.error('Error al eliminar'),
  })

  if (!shopId) return <div className="bg-white rounded-xl shadow-card p-6 text-center text-muted">Configura tu barbería primero</div>

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <h3 className="text-base font-semibold text-primary font-heading mb-4">Galería de fotos</h3>
      <ImageUploader
        label="Agregar foto a la galería"
        uploadUrl={`/api/upload/barbershop-photo/${shopId}`}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['shop-photos', shopId] })}
      />
      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3].map(i => <div key={i} className="aspect-square bg-cream rounded-lg animate-pulse" />)}
          </div>
        ) : photos.length === 0 ? (
          <p className="text-center text-muted text-sm py-6">Sin fotos en la galería</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map(p => (
              <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden bg-cream">
                <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" />
                <button
                  onClick={() => deletePhoto(p.id)}
                  disabled={deleting}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

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

  const [info, setInfo] = useState({ name: '', description: '', address: '', city: '', phone: '', instagram: '', latitude: null, longitude: null })
  useEffect(() => {
    if (shop) setInfo({ name: shop.name || '', description: shop.description || '', address: shop.address || '', city: shop.city || '', phone: shop.phone || '', instagram: shop.instagram || '', latitude: shop.latitude ?? null, longitude: shop.longitude ?? null })
  }, [shop])

  const { mutate: saveInfo, isPending: savingInfo } = useMutation({
    mutationFn: () => api.put(`/api/barbershops/${shopId}`, info),
    onSuccess: () => { toast.success('Información guardada'); qc.invalidateQueries({ queryKey: ['my-barbershops'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  // El dueño pega el link de Google Maps de su local y el backend lo traduce a
  // lat/lng. Las coordenadas quedan en el formulario, no se guardan solas: se
  // mandan con el resto de la ficha al tocar "Guardar Cambios".
  const [mapLink, setMapLink] = useState('')
  const { mutate: resolveMapLink, isPending: resolvingMap } = useMutation({
    mutationFn: () => api.post('/api/barbershops/resolve-map-link', { url: mapLink }).then(r => r.data),
    onSuccess: (coords) => {
      setInfo(prev => ({ ...prev, latitude: coords.latitude, longitude: coords.longitude }))
      setMapLink('')
      toast.success('Ubicación encontrada. Guardá los cambios para aplicarla.')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'No pudimos leer ese link'),
  })

  const hasCoords = info.latitude != null && info.longitude != null

  const [schedules, setSchedules] = useState(
    DAYS.map((d, i) => ({ dayOfWeek: DAY_OF_WEEK[i], dayName: d, isOpen: true, openTime: '08:00', closeTime: '18:00' }))
  )

  // Faltaba por completo: el formulario se armaba siempre con los valores en
  // duro de arriba, así que al recargar parecía que lo guardado se había
  // perdido. Los datos sí estaban en la base; nunca se leían.
  const { data: schedulesData } = useQuery({
    queryKey: ['schedules', shopId],
    queryFn: () => api.get(`/api/schedules/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  useEffect(() => {
    const filas = schedulesData?.schedules
    if (!filas?.length) return
    // Mapeo POR dayOfWeek, no por posición: el GET ordena por dayOfWeek
    // ascendente, o sea domingo (0) primero, mientras que DAYS pinta lunes
    // primero. Asignar por índice correría los siete días y pondría el horario
    // del domingo bajo la etiqueta "Lunes".
    setSchedules(DAYS.map((dayName, i) => {
      const dayOfWeek = DAY_OF_WEEK[i]
      const fila = filas.find(f => f.dayOfWeek === dayOfWeek)
      return fila
        ? { dayOfWeek, dayName, isOpen: fila.isOpen, openTime: fila.openTime, closeTime: fila.closeTime }
        // Día sin fila guardada: se deja el default en vez de dejarlo vacío.
        : { dayOfWeek, dayName, isOpen: true, openTime: '08:00', closeTime: '18:00' }
    }))
  }, [schedulesData])

  // Una sola petición con la semana entera: el endpoint es setWeekSchedule y
  // recorre el array del lado del servidor. Mandar siete en paralelo duplicaba
  // filas (cada una hacía su propio findFirst antes de crear) y podía dejar la
  // semana a medio guardar si una fallaba.
  // dayName es solo para pintar la etiqueta y barbershopId ya viaja en la URL:
  // ninguno de los dos llega al servicio, así que no se envían.
  const { mutate: saveSchedules, isPending: savingSchedules } = useMutation({
    mutationFn: () => api.post(`/api/schedules/${shopId}`, {
      schedules: schedules.map(({ dayOfWeek, isOpen, openTime, closeTime }) => ({
        dayOfWeek, isOpen, openTime, closeTime,
      })),
    }),
    onSuccess: () => {
      toast.success('Horarios guardados')
      qc.invalidateQueries({ queryKey: ['schedules', shopId] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al guardar horarios'),
  })

  // Los tres arrancan en los defaults del modelo y se sincronizan abajo. El
  // inicializador de useState solo corre en el primer render, cuando configData
  // todavía es undefined porque la query no resolvió: por eso leer la config ahí
  // dejaba los valores clavados en 60/40 y 10 cortes aunque la barbería tuviera
  // otra cosa guardada. Mismo patrón que `info` con `shop`.
  const [barberPct, setBarberPct] = useState(60)
  const [loyaltyActive, setLoyaltyActive] = useState(true)
  const [loyaltyVisits, setLoyaltyVisits] = useState(10)

  useEffect(() => {
    const c = configData?.config
    if (!c) return
    setBarberPct(c.barberPercentage ?? 60)
    setLoyaltyActive(c.loyaltyEnabled ?? true)
    // El campo del modelo es cutsForFreeService. Antes se leía primero
    // c.loyaltyVisits, que no existe en BarberShopConfig: rama muerta.
    setLoyaltyVisits(c.cutsForFreeService ?? 10)
  }, [configData])

  const shopPct = 100 - barberPct
  const exampleCut = 25000
  const { mutate: saveConfig, isPending: savingConfig } = useMutation({
    mutationFn: () => api.put(`/api/config/${shopId}`, { barberPercentage: barberPct, shopPercentage: shopPct }),
    onSuccess: () => {
      toast.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['config', shopId] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error'),
  })

  const { mutate: saveLoyalty, isPending: savingLoyalty } = useMutation({
    mutationFn: () => api.put(`/api/config/${shopId}`, {
      loyaltyEnabled: loyaltyActive,
      cutsForFreeService: loyaltyVisits,
    }),
    onSuccess: () => {
      toast.success('Configuración de fidelización guardada')
      qc.invalidateQueries({ queryKey: ['config', shopId] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Error al guardar'),
  })

  const sub = subData?.subscriptions?.[0]
  const daysLeft = sub ? Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0
  const progress = sub ? Math.max(0, Math.min(100, (daysLeft / 30) * 100)) : 0

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-[rgba(74,44,10,0.08)] p-1 overflow-x-auto w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer border-b-2 ${
              tab === t.key
                ? 'border-primary text-primary font-bold bg-cream'
                : 'border-transparent text-muted hover:text-primary hover:bg-cream/50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* INFO */}
      {tab === 'info' && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-base font-semibold text-primary font-heading mb-4">Información de la Barbería</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre de la barbería" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} />
            <Input label="Ciudad" value={info.city} onChange={e => setInfo({ ...info, city: e.target.value })} />
            <Input label="Dirección" value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} />
            <Input label="Teléfono" value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} />
            <Input label="Instagram" placeholder="@mibarberia" value={info.instagram} onChange={e => setInfo({ ...info, instagram: e.target.value })} />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-muted block mb-1">Descripción</label>
            <textarea className="w-full rounded-lg border border-[rgba(74,44,10,0.1)] px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none bg-white"
              rows={3} value={info.description} onChange={e => setInfo({ ...info, description: e.target.value })} />
          </div>
          <div className="mt-4 rounded-lg border border-[rgba(74,44,10,0.1)] p-4">
            <label className="text-sm font-medium text-muted block">Ubicación en el mapa</label>
            <p className="text-xs text-muted mt-0.5">
              Abrí tu local en Google Maps, tocá <span className="font-medium">Compartir</span> y pegá el link acá.
              Sin esto tu barbería no aparece en el mapa de la app.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <input
                type="url"
                value={mapLink}
                onChange={e => setMapLink(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && mapLink.trim() && !resolvingMap) resolveMapLink() }}
                placeholder="https://maps.app.goo.gl/..."
                className="flex-1 rounded-lg border border-[rgba(74,44,10,0.1)] px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-white" />
              <button
                type="button"
                onClick={() => resolveMapLink()}
                disabled={resolvingMap || !mapLink.trim()}
                className="px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50 whitespace-nowrap">
                {resolvingMap ? 'Buscando...' : 'Buscar ubicación'}
              </button>
            </div>
            <div className="mt-2 text-xs">
              {hasCoords ? (
                <span className="text-green-700">
                  📍 Ubicación guardada: {info.latitude}, {info.longitude}
                  {' · '}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${info.latitude},${info.longitude}`}
                    target="_blank" rel="noreferrer"
                    className="underline hover:no-underline">
                    ver en el mapa
                  </a>
                </span>
              ) : (
                <span className="text-muted">Todavía sin ubicación — tu barbería no se muestra en el mapa.</span>
              )}
            </div>
          </div>
          {shopId && (
            <div className="mt-4">
              <ImageUploader
                label="Logo de la barbería"
                uploadUrl={`/api/upload/barbershop-logo/${shopId}`}
                currentUrl={shop?.logo}
                onSuccess={() => qc.invalidateQueries({ queryKey: ['my-barbershops'] })}
              />
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button onClick={() => saveInfo()} disabled={savingInfo}
              className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50">
              {savingInfo ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      )}

      {/* HORARIOS */}
      {tab === 'schedules' && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-base font-semibold text-primary font-heading mb-4">Horarios de Atención</h3>
          <div className="space-y-3">
            {schedules.map((s, i) => (
              <div key={s.dayOfWeek} className="flex items-center gap-4 py-3 border-b border-[rgba(74,44,10,0.06)] last:border-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={s.isOpen}
                    onChange={e => setSchedules(prev => prev.map((x, j) => j === i ? { ...x, isOpen: e.target.checked } : x))}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-soft rounded-full peer peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                </label>
                <span className={`w-24 text-sm font-medium ${s.isOpen ? 'text-primary' : 'text-muted'}`}>{s.dayName}</span>
                {s.isOpen && (
                  <div className="flex items-center gap-2">
                    <input type="time" value={s.openTime}
                      onChange={e => setSchedules(prev => prev.map((x, j) => j === i ? { ...x, openTime: e.target.value } : x))}
                      className="rounded-lg border border-[rgba(74,44,10,0.1)] px-2 py-1.5 text-sm outline-none focus:border-accent" />
                    <span className="text-muted text-sm">→</span>
                    <input type="time" value={s.closeTime}
                      onChange={e => setSchedules(prev => prev.map((x, j) => j === i ? { ...x, closeTime: e.target.value } : x))}
                      className="rounded-lg border border-[rgba(74,44,10,0.1)] px-2 py-1.5 text-sm outline-none focus:border-accent" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => saveSchedules()} disabled={savingSchedules}
              className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50">
              {savingSchedules ? 'Guardando...' : 'Guardar Horarios'}
            </button>
          </div>
        </div>
      )}

      {/* PORCENTAJES */}
      {tab === 'finance' && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-base font-semibold text-primary font-heading mb-1">Distribución de Porcentajes</h3>
          <p className="text-sm text-muted mb-6">Define cómo se divide el ingreso de cada corte entre barbero y barbería</p>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-primary">Barbero</label>
                <span className="text-lg font-bold text-accent">{barberPct}%</span>
              </div>
              <input type="range" min={40} max={90} value={barberPct} onChange={e => setBarberPct(Number(e.target.value))}
                className="w-full accent-accent" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-primary">Barbería</label>
                <span className="text-lg font-bold text-primary">{shopPct}%</span>
              </div>
              <div className="w-full bg-gray-soft rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${shopPct}%` }} />
              </div>
            </div>
            <div className="bg-cream rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-primary">Vista previa con un corte de {formatCurrency(exampleCut)}:</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Barbero ({barberPct}%):</span>
                <span className="font-bold text-accent">{formatCurrency(exampleCut * barberPct / 100)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Barbería ({shopPct}%):</span>
                <span className="font-bold text-primary">{formatCurrency(exampleCut * shopPct / 100)}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => saveConfig()} disabled={savingConfig}
                className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50">
                {savingConfig ? 'Guardando...' : 'Guardar Porcentajes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIDELIZACIÓN */}
      {tab === 'loyalty' && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-base font-semibold text-primary font-heading mb-4">Programa de Fidelización</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-primary">Activar programa de fidelización</p>
                <p className="text-sm text-muted">Los clientes acumulan visitas para un corte gratis</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={loyaltyActive} onChange={e => setLoyaltyActive(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-soft rounded-full peer peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
            {loyaltyActive && (
              <>
                <Input label="Corte gratis cada X visitas" type="number" min={1} max={50}
                  value={loyaltyVisits} onChange={e => setLoyaltyVisits(Number(e.target.value))} />
                <div className="bg-cream rounded-xl p-4">
                  <p className="text-sm text-muted">
                    Cada <span className="font-bold text-primary">{loyaltyVisits}</span> cortes, el cliente obtiene <span className="font-bold text-accent">1 gratis 🎁</span>
                  </p>
                </div>
              </>
            )}
            <div className="flex justify-end">
              <button onClick={() => saveLoyalty()} disabled={savingLoyalty}
                className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50">
                {savingLoyalty ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GALERÍA */}
      {tab === 'gallery' && (
        <GalleryTab shopId={shopId} />
      )}

      {/* SUSCRIPCIÓN */}
      {tab === 'plan' && (
        <div className="space-y-4">
          {sub && (
            <div className="bg-white rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted">Plan activo</p>
                  <h3 className="text-2xl font-bold text-primary font-heading">{sub.plan}</h3>
                  <p className="text-sm text-muted mt-0.5">Vence el {toDisplayDate(sub.endDate).toLocaleDateString('es-CO')}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {sub.status === 'ACTIVE' ? 'Activo' : 'Vencido'}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted">
                  <span>{daysLeft} días restantes</span><span>30 días</span>
                </div>
                <div className="w-full bg-gray-soft rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map(p => (
              <div key={p.key} className={`bg-white rounded-xl border-2 p-5 relative ${shop?.plan === p.key ? 'border-accent' : 'border-[rgba(74,44,10,0.08)]'}`}>
                {shop?.plan === p.key && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
                    Plan Actual
                  </span>
                )}
                <h3 className="text-lg font-bold text-primary font-heading">{p.label}</h3>
                <p className="mt-1 mb-4">
                  <span className="text-2xl font-bold text-accent">{formatCurrency(p.price)}</span>
                  <span className="text-sm text-muted">/mes</span>
                </p>
                <ul className="space-y-1.5 mb-4">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted">
                      <span className="text-accent font-bold">✓</span>{f}
                    </li>
                  ))}
                </ul>
                {shop?.plan !== p.key && (
                  <button
                    onClick={() => toast('Integración Stripe próximamente', { icon: '💳' })}
                    className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cambiar Plan
                  </button>
                )}
                {shop?.plan === p.key && (
                  <button disabled className="w-full py-2.5 bg-gray-100 text-muted rounded-lg text-sm font-medium cursor-not-allowed">
                    Plan Actual
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
