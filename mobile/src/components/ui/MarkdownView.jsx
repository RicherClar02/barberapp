import { View, Text, StyleSheet, Linking } from 'react-native'
import { colors, fontSize, spacing, radius } from '../../constants/theme'

// Renderizador mínimo del subconjunto de markdown que usan los documentos
// legales de /docs/legal: encabezados, párrafos, listas, tablas, citas,
// separadores, negrita, cursiva, código y enlaces.
//
// Se hace a mano en vez de traer una librería porque el contenido lo
// escribimos nosotros (no es markdown arbitrario de un usuario) y así la app
// no gana una dependencia más solo para mostrar cuatro documentos.

// ─── Inline: **negrita**, *cursiva*, `código`, [texto](url) ───
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

function renderInline(text, keyPrefix) {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`

    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={key} style={styles.bold}>{part.slice(2, -2)}</Text>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <Text key={key} style={styles.code}>{part.slice(1, -1)}</Text>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={key} style={styles.italic}>{part.slice(1, -1)}</Text>
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const [, label, url] = link
      // Los enlaces relativos entre documentos (./privacidad.md) no llevan a
      // ninguna parte dentro de la app: se muestran como texto normal.
      if (!/^(https?:|mailto:|tel:)/.test(url)) {
        return <Text key={key}>{label}</Text>
      }
      return (
        <Text key={key} style={styles.link} onPress={() => Linking.openURL(url).catch(() => {})}>
          {label}
        </Text>
      )
    }

    return <Text key={key}>{part}</Text>
  })
}

// Una fila de tabla markdown → celdas, sin los pipes de los extremos.
const splitRow = (line) =>
  line.replace(/^\||\|$/g, '').split('|').map(c => c.trim())

const isSeparatorRow = (line) => /^\|?[\s:-]+\|[\s|:-]*$/.test(line)

export default function MarkdownView({ content }) {
  if (!content) return null

  const lines = content.split('\n')
  const blocks = []
  let paragraph = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ')
    blocks.push(
      <Text key={`p-${blocks.length}`} style={styles.paragraph}>
        {renderInline(text, `p${blocks.length}`)}
      </Text>
    )
    paragraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') { flushParagraph(); continue }

    // Separador horizontal
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph()
      blocks.push(<View key={`hr-${i}`} style={styles.hr} />)
      continue
    }

    // Encabezados
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      const level = heading[1].length
      const style = [styles.h1, styles.h2, styles.h3, styles.h4][level - 1]
      blocks.push(
        <Text key={`h-${i}`} style={style}>{renderInline(heading[2], `h${i}`)}</Text>
      )
      continue
    }

    // Tabla: cabecera + fila de guiones + cuerpo
    if (trimmed.startsWith('|') && isSeparatorRow(lines[i + 1]?.trim() || '')) {
      flushParagraph()
      const header = splitRow(trimmed)
      const rows = []
      let j = i + 2
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        rows.push(splitRow(lines[j].trim()))
        j++
      }
      blocks.push(
        <View key={`t-${i}`} style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            {header.map((cell, c) => (
              <Text key={c} style={[styles.tableCell, styles.tableHeaderCell]}>
                {renderInline(cell, `th${i}-${c}`)}
              </Text>
            ))}
          </View>
          {rows.map((row, r) => (
            <View key={r} style={styles.tableRow}>
              {row.map((cell, c) => (
                <Text key={c} style={styles.tableCell}>
                  {renderInline(cell, `td${i}-${r}-${c}`)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )
      i = j - 1
      continue
    }

    // Cita
    if (trimmed.startsWith('> ')) {
      flushParagraph()
      blocks.push(
        <View key={`q-${i}`} style={styles.quote}>
          <Text style={styles.quoteText}>{renderInline(trimmed.slice(2), `q${i}`)}</Text>
        </View>
      )
      continue
    }

    // Lista con viñetas
    const bullet = trimmed.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      blocks.push(
        <View key={`li-${i}`} style={styles.listItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.listText}>{renderInline(bullet[1], `li${i}`)}</Text>
        </View>
      )
      continue
    }

    // Lista numerada
    const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      blocks.push(
        <View key={`ol-${i}`} style={styles.listItem}>
          <Text style={styles.bulletNumber}>{numbered[1]}.</Text>
          <Text style={styles.listText}>{renderInline(numbered[2], `ol${i}`)}</Text>
        </View>
      )
      continue
    }

    paragraph.push(trimmed)
  }

  flushParagraph()

  return <View>{blocks}</View>
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary, marginTop: spacing.md, marginBottom: spacing.sm },
  h2: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  h3: { fontSize: fontSize.md, fontWeight: '700', color: colors.secondary, marginTop: spacing.md, marginBottom: 6 },
  h4: { fontSize: fontSize.sm, fontWeight: '700', color: colors.secondary, marginTop: spacing.sm, marginBottom: 4 },
  paragraph: { fontSize: fontSize.sm, lineHeight: 22, color: colors.black, marginBottom: spacing.sm },
  bold: { fontWeight: '700', color: colors.primary },
  italic: { fontStyle: 'italic' },
  code: {
    fontFamily: 'monospace',
    fontSize: fontSize.xs,
    color: colors.secondary,
    backgroundColor: colors.cream,
  },
  link: { color: colors.accent, fontWeight: '600', textDecorationLine: 'underline' },
  hr: { height: 1, backgroundColor: colors.graySoft, marginVertical: spacing.md },
  listItem: { flexDirection: 'row', marginBottom: 6, paddingRight: spacing.sm },
  bulletDot: { color: colors.accent, fontSize: fontSize.sm, marginRight: spacing.sm, lineHeight: 22 },
  bulletNumber: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '700', marginRight: spacing.sm, lineHeight: 22, minWidth: 18 },
  listText: { flex: 1, fontSize: fontSize.sm, lineHeight: 22, color: colors.black },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.sm,
  },
  quoteText: { fontSize: fontSize.sm, lineHeight: 21, color: colors.secondary },
  table: {
    borderWidth: 1,
    borderColor: colors.graySoft,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.graySoft },
  tableHeaderRow: { backgroundColor: colors.cream },
  tableCell: {
    flex: 1,
    padding: spacing.sm,
    fontSize: fontSize.xs,
    lineHeight: 18,
    color: colors.black,
  },
  tableHeaderCell: { fontWeight: '700', color: colors.primary },
})
