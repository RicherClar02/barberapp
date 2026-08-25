import { useEffect } from 'react'

// Fija el título de la pestaña como "<title> | Estilo" mientras el componente
// esté montado, y restaura el anterior al desmontar. Útil para páginas que no
// pasan por el Layout (ej. Login), ya que el Layout ya gestiona el título del
// panel según la ruta.
export default function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} | Estilo` : 'Estilo'
    return () => {
      document.title = previous
    }
  }, [title])
}
