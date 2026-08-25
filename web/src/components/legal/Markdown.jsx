// Renderizador del subconjunto de markdown que usan los documentos legales de
// /docs/legal: encabezados, párrafos, listas, tablas, citas, separadores,
// negrita, cursiva, código y enlaces.
//
// Genera elementos de React, nunca `dangerouslySetInnerHTML`: aunque el texto
// venga de nuestro propio backend, así no hay forma de inyectar HTML.

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

function renderInline(text, keyPrefix) {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key} className="font-semibold text-primary">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={key} className="rounded bg-cream px-1.5 py-0.5 font-mono text-[0.85em] text-secondary">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const [, label, url] = link
      // Los enlaces relativos del markdown (./politica-de-privacidad.md)
      // apuntan a archivos del repo; en la web se traducen a sus rutas.
      const internal = {
        './terminos-y-condiciones.md': '/terminos',
        './politica-de-privacidad.md': '/privacidad',
        './politica-de-cookies.md': '/cookies',
        './politica-eliminacion-cuenta.md': '/eliminar-cuenta',
      }[url]

      if (internal) {
        return <a key={key} href={internal} className="font-medium text-accent underline">{label}</a>
      }
      if (url.startsWith('.')) return <span key={key}>{label}</span>

      return (
        <a
          key={key}
          href={url}
          target={url.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="font-medium text-accent underline break-words"
        >
          {label}
        </a>
      )
    }

    return <span key={key}>{part}</span>
  })
}

const splitRow = (line) => line.replace(/^\||\|$/g, '').split('|').map(c => c.trim())
const isSeparatorRow = (line) => /^\|?[\s:-]+\|[\s|:-]*$/.test(line)

export default function Markdown({ content }) {
  if (!content) return null

  const lines = content.split('\n')
  const blocks = []
  let paragraph = []
  let listBuffer = null // { ordered: boolean, items: [] }

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ')
    blocks.push(
      <p key={`p-${blocks.length}`} className="mb-4 leading-relaxed text-black-soft">
        {renderInline(text, `p${blocks.length}`)}
      </p>
    )
    paragraph = []
  }

  const flushList = () => {
    if (!listBuffer) return
    const { ordered, items } = listBuffer
    const Tag = ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag
        key={`l-${blocks.length}`}
        className={`mb-4 space-y-1.5 pl-5 text-black-soft ${ordered ? 'list-decimal' : 'list-disc'} marker:text-accent`}
      >
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">{renderInline(item, `li${blocks.length}-${i}`)}</li>
        ))}
      </Tag>
    )
    listBuffer = null
  }

  const flushAll = () => { flushParagraph(); flushList() }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') { flushAll(); continue }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      flushAll()
      blocks.push(<hr key={`hr-${i}`} className="my-8 border-gray-soft" />)
      continue
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      flushAll()
      const level = heading[1].length
      const content = renderInline(heading[2], `h${i}`)
      const classes = {
        1: 'mb-6 mt-2 font-heading text-3xl font-bold text-primary',
        2: 'mb-3 mt-10 font-heading text-xl font-semibold text-primary',
        3: 'mb-2 mt-6 font-heading text-lg font-semibold text-secondary',
        4: 'mb-2 mt-4 font-heading text-base font-semibold text-secondary',
      }[level]
      const Tag = `h${level}`
      blocks.push(<Tag key={`h-${i}`} className={classes}>{content}</Tag>)
      continue
    }

    if (trimmed.startsWith('|') && isSeparatorRow(lines[i + 1]?.trim() || '')) {
      flushAll()
      const header = splitRow(trimmed)
      const rows = []
      let j = i + 2
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        rows.push(splitRow(lines[j].trim()))
        j++
      }
      blocks.push(
        // Las tablas legales son anchas: se desplazan dentro de su caja para
        // que la página nunca haga scroll horizontal en móvil.
        <div key={`t-${i}`} className="mb-6 overflow-x-auto rounded-xl border border-gray-soft">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead className="bg-cream">
              <tr>
                {header.map((cell, c) => (
                  <th key={c} className="border-b border-gray-soft px-4 py-3 text-left font-semibold text-primary">
                    {renderInline(cell, `th${i}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b border-gray-soft last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} className="px-4 py-3 align-top text-black-soft">
                      {renderInline(cell, `td${i}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      i = j - 1
      continue
    }

    if (trimmed.startsWith('> ')) {
      flushAll()
      blocks.push(
        <blockquote key={`q-${i}`} className="mb-4 rounded-r-lg border-l-4 border-accent bg-cream px-4 py-3 text-secondary">
          {renderInline(trimmed.slice(2), `q${i}`)}
        </blockquote>
      )
      continue
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      if (!listBuffer || listBuffer.ordered) { flushList(); listBuffer = { ordered: false, items: [] } }
      listBuffer.items.push(bullet[1])
      continue
    }

    const numbered = trimmed.match(/^\d+\.\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      if (!listBuffer || !listBuffer.ordered) { flushList(); listBuffer = { ordered: true, items: [] } }
      listBuffer.items.push(numbered[1])
      continue
    }

    flushList()
    paragraph.push(trimmed)
  }

  flushAll()

  return <div className="text-[15px]">{blocks}</div>
}
