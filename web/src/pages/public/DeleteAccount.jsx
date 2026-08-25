import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mail, ShieldAlert, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import api from '../../api/axios'
import PublicLayout from '../../components/public/PublicLayout'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { COMPANY } from '../../constants/company'

const DELETED = [
  'Tu nombre, correo, teléfono y WhatsApp',
  'Tu foto de perfil',
  'Tus preferencias de notificación y notificaciones recibidas',
  'Tus conversaciones con el asistente virtual',
  'Tus cortes acumulados en programas de fidelización',
  'El vínculo entre tú y tus citas y reseñas históricas',
]

const RETAINED = [
  'Registros de facturación de suscripciones, por obligación fiscal (5 años)',
  'Estadísticas agregadas y anónimas que ya no permiten identificarte',
]

// Página pública exigida por Google Play: cualquiera debe poder pedir la
// eliminación de su cuenta sin tener la app instalada.
//
// Dos pasos: aquí se pide el correo y el backend envía un enlace con token;
// al abrirlo se vuelve a esta misma página con ?token=... y se ejecuta el
// borrado. Sin ese segundo paso, cualquiera podría eliminar cuentas ajenas.
export default function DeleteAccount() {
  useDocumentTitle('Eliminar mi cuenta')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-heading text-3xl font-bold text-primary">Eliminar mi cuenta</h1>
        <p className="mb-8 text-secondary">
          Puedes eliminar tu cuenta de Estilo y todos tus datos personales, sin costo y sin dar
          explicaciones.
        </p>

        {token ? <ConfirmStep token={token} /> : <RequestStep />}

        <WhatHappens />

        <div className="mt-8 rounded-2xl border border-gray-soft bg-white p-6">
          <h2 className="mb-2 font-heading text-lg font-semibold text-primary">Otras formas de hacerlo</h2>
          <ul className="space-y-2 text-sm text-secondary">
            <li>
              <span className="font-medium text-primary">Desde la app:</span> Perfil → Legal y
              privacidad → Eliminar mi cuenta.
            </li>
            <li>
              <span className="font-medium text-primary">Por correo:</span>{' '}
              <a href={`mailto:${COMPANY.email}`} className="text-accent underline">{COMPANY.email}</a>,
              escribiendo desde la dirección registrada en tu cuenta.
            </li>
          </ul>
          <p className="mt-4 text-sm text-secondary">
            Detalle completo del procedimiento en la{' '}
            <Link to="/privacidad" className="text-accent underline">Política de Privacidad</Link>.
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}

// ─── Paso 1: pedir el enlace ───
function RequestStep() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | sent | error
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const { data } = await api.post('/api/users/account-deletion/request', { email: email.trim() })
      setMessage(data.message)
      setStatus('sent')
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
        'No se pudo procesar la solicitud. Intenta más tarde o escríbenos por correo.'
      )
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6">
        <CheckCircle2 size={28} className="mb-3 text-success" />
        <h2 className="mb-2 font-heading text-lg font-semibold text-primary">Revisa tu correo</h2>
        <p className="text-sm leading-relaxed text-secondary">{message}</p>
        <p className="mt-3 text-sm text-secondary">
          El enlace es válido por <strong className="text-primary">24 horas</strong>. Tu cuenta
          seguirá intacta hasta que lo abras y confirmes.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-soft bg-white p-6 shadow-card">
      <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-primary">
        Correo electrónico de tu cuenta
      </label>
      <p className="mb-3 text-xs text-muted">
        Te enviaremos un enlace de confirmación. Nada se elimina hasta que lo abras.
      </p>

      <div className="relative">
        <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="w-full rounded-xl border border-gray-soft bg-white py-3 pl-9 pr-3 text-sm text-black-soft outline-none transition focus:border-accent"
        />
      </div>

      {status === 'error' && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        <Trash2 size={16} />
        {status === 'loading' ? 'Enviando...' : 'Solicitar eliminación'}
      </button>
    </form>
  )
}

// ─── Paso 2: confirmar con el token del correo ───
function ConfirmStep({ token }) {
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [message, setMessage] = useState('')

  const confirm = async () => {
    setStatus('loading')
    try {
      const { data } = await api.post('/api/users/account-deletion/confirm', { token })
      setMessage(data.message)
      setStatus('done')
    } catch (err) {
      setMessage(err.response?.data?.message || 'El enlace es inválido o ya expiró.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6">
        <CheckCircle2 size={28} className="mb-3 text-success" />
        <h2 className="mb-2 font-heading text-lg font-semibold text-primary">Cuenta eliminada</h2>
        <p className="text-sm leading-relaxed text-secondary">{message}</p>
        <p className="mt-3 text-sm text-secondary">
          Te enviamos un correo de confirmación. La purga de las copias de seguridad se completa
          en un máximo de 30 días.
        </p>
        <Link to="/" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-destructive/40 bg-white p-6 shadow-card">
      <ShieldAlert size={28} className="mb-3 text-destructive" />
      <h2 className="mb-2 font-heading text-lg font-semibold text-primary">
        Última confirmación
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-secondary">
        Al continuar eliminaremos tu cuenta y tus datos personales de forma{' '}
        <strong className="text-destructive">permanente e irreversible</strong>. Tus citas futuras
        se cancelarán y perderás tus cortes acumulados de fidelización.
      </p>

      {status === 'error' && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={confirm}
          disabled={status === 'loading'}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <Trash2 size={16} />
          {status === 'loading' ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}
        </button>
        <Link
          to="/"
          className="flex flex-1 items-center justify-center rounded-xl border border-gray-soft py-3 text-sm font-semibold text-secondary transition hover:border-primary hover:text-primary"
        >
          Cancelar
        </Link>
      </div>
    </div>
  )
}

function WhatHappens() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-gray-soft bg-white p-5">
        <h2 className="mb-3 font-heading text-base font-semibold text-primary">Qué se elimina</h2>
        <ul className="space-y-2 text-sm text-secondary">
          {DELETED.map(item => (
            <li key={item} className="flex gap-2">
              <span className="mt-0.5 font-bold text-destructive">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-gray-soft bg-white p-5">
        <h2 className="mb-3 font-heading text-base font-semibold text-primary">
          Qué se conserva
        </h2>
        <ul className="space-y-2 text-sm text-secondary">
          {RETAINED.map(item => (
            <li key={item} className="flex gap-2">
              <span className="mt-0.5 text-accent">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs italic text-muted">
          Se conservan desvinculados de tu identidad. Proceso completo: máximo 30 días.
        </p>
      </div>
    </div>
  )
}
