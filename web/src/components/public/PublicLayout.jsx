import { Link, NavLink } from 'react-router-dom'
import { COMPANY } from '../../constants/company'

// Marco de las páginas que cualquiera puede ver sin iniciar sesión.
// Las tiendas exigen que términos y privacidad sean accesibles con una URL
// pública, así que estas páginas no pasan por el Layout del panel (sidebar,
// sesión, etc.) sino por este.
const LEGAL_LINKS = [
  { to: '/terminos', label: 'Términos y Condiciones' },
  { to: '/privacidad', label: 'Política de Privacidad' },
  { to: '/cookies', label: 'Política de Cookies' },
  { to: '/eliminar-cuenta', label: 'Eliminar mi cuenta' },
]

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-soft bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg text-accent">✂</span>
          <span className="font-heading text-lg font-bold tracking-tight text-primary">ESTILO</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          <NavLink
            to="/terminos"
            className={({ isActive }) =>
              `hidden rounded-lg px-2.5 py-1.5 sm:block ${isActive ? 'font-semibold text-primary' : 'text-secondary hover:text-primary'}`
            }
          >
            Términos
          </NavLink>
          <NavLink
            to="/privacidad"
            className={({ isActive }) =>
              `hidden rounded-lg px-2.5 py-1.5 sm:block ${isActive ? 'font-semibold text-primary' : 'text-secondary hover:text-primary'}`
            }
          >
            Privacidad
          </NavLink>
          <Link
            to="/login"
            className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:opacity-90"
          >
            Ingresar
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-soft bg-white">
      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-accent">✂</span>
            <span className="font-heading font-bold text-primary">ESTILO</span>
          </div>
          <p className="text-sm leading-relaxed text-secondary">
            <span className="font-semibold text-primary">{COMPANY.name}</span><br />
            {COMPANY.legalRepresentative}<br />
            C.C. {COMPANY.idNumber}<br />
            {COMPANY.address}
          </p>
          <p className="mt-3 text-sm text-secondary">
            <a href={`tel:${COMPANY.phoneHref}`} className="hover:text-primary">{COMPANY.phone}</a><br />
            <a href={`mailto:${COMPANY.email}`} className="break-all hover:text-primary">{COMPANY.email}</a>
          </p>
        </div>

        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-primary">Legal</h3>
          <ul className="space-y-2 text-sm">
            {LEGAL_LINKS.map(link => (
              <li key={link.to}>
                <Link to={link.to} className="text-secondary hover:text-primary hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-soft px-4 py-5 text-center text-xs text-muted sm:px-6">
        © 2026 {COMPANY.name}. Todos los derechos reservados. Hecho en Villavicencio, Colombia 🇨🇴
      </div>
    </footer>
  )
}

export default function PublicLayout({ children, wide = false }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Header />
      <main className={`flex-1 ${wide ? '' : 'mx-auto w-full max-w-4xl px-4 py-10 sm:px-6'}`}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
