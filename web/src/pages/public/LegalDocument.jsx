import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import api from '../../api/axios'
import PublicLayout from '../../components/public/PublicLayout'
import Markdown from '../../components/legal/Markdown'
import useDocumentTitle from '../../hooks/useDocumentTitle'

// Base común de /terminos, /privacidad y /cookies. El texto lo sirve el
// backend desde /docs/legal, de modo que web y app móvil muestran siempre la
// misma versión sin mantener copias.
export default function LegalDocument({ slug, title }) {
  useDocumentTitle(title)
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // Cambiar esta clave vuelve a disparar el efecto: así el botón "Reintentar"
  // no necesita duplicar la lógica de carga.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    // `cancelled` evita escribir estado de una petición vieja si el usuario
    // navega a otro documento mientras la anterior sigue en vuelo.
    let cancelled = false

    const fetchDocument = async () => {
      try {
        const { data } = await api.get(`/api/legal/documents/${slug}`)
        if (cancelled) return
        setDoc(data)
        setError('')
      } catch {
        if (cancelled) return
        setError('No se pudo cargar el documento. Intenta de nuevo en unos minutos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDocument()
    return () => { cancelled = true }
  }, [slug, attempt])

  const retry = () => {
    setLoading(true)
    setError('')
    setAttempt(a => a + 1)
  }

  return (
    <PublicLayout>
      <article className="rounded-2xl border border-gray-soft bg-white p-6 shadow-card sm:p-10">
        {loading && (
          <div className="animate-pulse space-y-4" aria-label="Cargando documento">
            <div className="h-8 w-2/3 rounded bg-gray-soft" />
            <div className="h-4 w-1/3 rounded bg-gray-soft" />
            <div className="mt-8 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-3 rounded bg-gray-soft" style={{ width: `${70 + (i % 4) * 8}%` }} />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="py-10 text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-destructive" />
            <p className="mb-5 text-sm text-secondary">{error}</p>
            <button
              onClick={retry}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              <RefreshCw size={15} /> Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {doc?.version && (
              <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-cream px-3 py-1 font-medium text-secondary">
                  Versión {doc.version}
                </span>
                <span className="rounded-full bg-cream px-3 py-1 font-medium text-secondary">
                  Documento oficial de RC Studio
                </span>
              </div>
            )}
            <Markdown content={doc?.content} />
          </>
        )}
      </article>
    </PublicLayout>
  )
}
