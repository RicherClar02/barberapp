import { Link } from 'react-router-dom'
import { MapPin, CalendarCheck, Star, Scissors, BarChart3, Users, Clock, Shield } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import useDocumentTitle from '../../hooks/useDocumentTitle'

const AUDIENCES = [
  {
    icon: Users,
    tag: 'Para clientes',
    title: 'Reserva sin llamar ni esperar',
    points: [
      { icon: MapPin, text: 'Encuentra las barberías más cercanas y mira sus precios reales.' },
      { icon: CalendarCheck, text: 'Elige barbero, servicio y hora. Confirmas en menos de un minuto.' },
      { icon: Clock, text: 'Recibe recordatorios para no perder tu turno.' },
      { icon: Star, text: 'Califica el servicio y acumula cortes para el que va gratis.' },
    ],
    note: 'Gratis. El servicio lo pagas en la barbería, como siempre.',
  },
  {
    icon: Scissors,
    tag: 'Para barberos',
    title: 'Tu agenda ordenada, tu trabajo visible',
    points: [
      { icon: CalendarCheck, text: 'Tus citas del día en una sola pantalla, sin cuadernos.' },
      { icon: BarChart3, text: 'Consulta tus ganancias y tu porcentaje al instante.' },
      { icon: Star, text: 'Construye tu reputación con las reseñas de tus clientes.' },
      { icon: Users, text: 'Comparte tu tarjeta digital para que te reserven directo.' },
    ],
    note: 'Gratis para barberos vinculados a una barbería registrada.',
  },
  {
    icon: BarChart3,
    tag: 'Para dueños',
    title: 'Administra tu barbería completa',
    points: [
      { icon: Users, text: 'Gestiona tu equipo, servicios, precios y horarios.' },
      { icon: BarChart3, text: 'Mira cuánto entra, cuánto se reparte y qué servicio deja más.' },
      { icon: MapPin, text: 'Aparece en el mapa para los clientes de tu zona.' },
      { icon: Star, text: 'Fideliza con promociones y cortes gratis configurables.' },
    ],
    note: 'Desde $30.000 COP al mes. Cancela cuando quieras, sin penalidad.',
  },
]

const PLANS = [
  { name: 'Básico', price: '$30.000', features: 'Agenda, barberos y servicios' },
  { name: 'Estándar', price: '$60.000', features: 'Todo lo anterior + finanzas y ofertas', highlight: true },
  { name: 'Premium', price: '$120.000', features: 'Todo + posición destacada y publicidad' },
]

export default function Landing() {
  // Tiene que coincidir con el <title> de index.html: el hook lo pisa al montar
  // y Google indexa el título que queda después de ejecutar el JS, no el estático.
  useDocumentTitle('Reserva tu cita en barberías de Villavicencio')

  return (
    <PublicLayout wide>
      {/* Hero */}
      <section className="px-4 py-16 text-center sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <span className="mb-5 inline-block rounded-full bg-white px-4 py-1.5 text-xs font-medium text-secondary shadow-card">
            Hecho en Villavicencio para toda Colombia 🇨🇴
          </span>
          <h1 className="mb-5 font-heading text-4xl font-bold leading-tight text-primary sm:text-5xl">
            Tu próximo corte en Villavicencio,<br />reservado en un minuto
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-secondary">
            Estilo conecta a quienes buscan barbería con los barberos de su ciudad. Encuentra,
            reserva y llega a la hora. Sin llamadas, sin filas, sin sorpresas de precio.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StoreBadge store="Google Play" />
            <StoreBadge store="App Store" />
          </div>
          <p className="mt-4 text-xs text-muted">Muy pronto en las tiendas</p>

          <p className="mt-8 text-sm text-secondary">
            ¿Tienes una barbería?{' '}
            <Link to="/login" className="font-semibold text-accent underline">
              Entra al panel de administración
            </Link>
          </p>
        </div>
      </section>

      {/* Tres públicos */}
      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center font-heading text-3xl font-bold text-primary">
            Una app, tres formas de usarla
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-secondary">
            Cada persona ve lo que necesita: el cliente reserva, el barbero organiza su día y el
            dueño administra el negocio.
          </p>

          <div className="grid gap-6 lg:grid-cols-3">
            {AUDIENCES.map(audience => (
              <div key={audience.tag} className="flex flex-col rounded-2xl border border-gray-soft bg-cream p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-accent">
                    <audience.icon size={20} />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {audience.tag}
                  </span>
                </div>

                <h3 className="mb-4 font-heading text-xl font-semibold text-primary">
                  {audience.title}
                </h3>

                <ul className="mb-5 flex-1 space-y-3">
                  {audience.points.map(point => (
                    <li key={point.text} className="flex gap-3 text-sm leading-relaxed text-secondary">
                      <point.icon size={16} className="mt-0.5 shrink-0 text-accent" />
                      <span>{point.text}</span>
                    </li>
                  ))}
                </ul>

                <p className="rounded-xl bg-white px-3 py-2.5 text-xs font-medium text-primary">
                  {audience.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center font-heading text-3xl font-bold text-primary">
            Planes para barberías
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-center text-secondary">
            Clientes y barberos usan Estilo gratis. Los dueños eligen el plan que le sirva a su
            negocio y pueden cancelar en cualquier momento, sin penalidad.
          </p>

          <div className="grid gap-5 sm:grid-cols-3">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`rounded-2xl border bg-white p-6 text-center ${
                  plan.highlight ? 'border-accent shadow-card' : 'border-gray-soft'
                }`}
              >
                {plan.highlight && (
                  <span className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Más elegido
                  </span>
                )}
                <h3 className="font-heading text-lg font-semibold text-primary">{plan.name}</h3>
                <p className="my-2 font-heading text-3xl font-bold text-primary">
                  {plan.price}
                  <span className="text-sm font-normal text-muted"> /mes</span>
                </p>
                <p className="text-sm leading-relaxed text-secondary">{plan.features}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            Precios en pesos colombianos (COP), impuestos incluidos. Consulta los{' '}
            <Link to="/terminos" className="text-accent underline">Términos y Condiciones</Link>.
          </p>
        </div>
      </section>

      {/* Confianza */}
      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          <div className="flex gap-4">
            <Shield size={22} className="mt-1 shrink-0 text-accent" />
            <div>
              <h3 className="mb-1 font-heading font-semibold text-primary">Tus datos, protegidos</h3>
              <p className="text-sm leading-relaxed text-secondary">
                Contraseñas cifradas, conexión HTTPS y tratamiento de datos conforme a la Ley 1581
                de 2012 de Colombia. Puedes descargar o eliminar tus datos cuando quieras.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Scissors size={22} className="mt-1 shrink-0 text-accent" />
            <div>
              <h3 className="mb-1 font-heading font-semibold text-primary">Pagas en la barbería</h3>
              <p className="text-sm leading-relaxed text-secondary">
                Estilo no cobra el corte ni retiene tu dinero. Reservas por la app y pagas
                directamente en el establecimiento, como toda la vida.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

// Marcador de posición hasta que la app esté publicada: no se enlaza a ninguna
// tienda para no prometer una descarga que todavía no existe.
function StoreBadge({ store }) {
  return (
    <div className="flex w-full max-w-[200px] cursor-default items-center justify-center gap-2 rounded-xl border border-gray-soft bg-white px-5 py-3 opacity-70">
      <span className="text-sm font-medium text-secondary">{store}</span>
      <span className="rounded bg-cream px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
        Pronto
      </span>
    </div>
  )
}
