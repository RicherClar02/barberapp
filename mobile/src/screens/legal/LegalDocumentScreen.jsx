import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native'
import api from '../../api/axios'
import MarkdownView from '../../components/ui/MarkdownView'
import { colors, fontSize, spacing, radius } from '../../constants/theme'

// Pantalla común de Terms.jsx y Privacy.jsx: descarga el markdown del
// backend (misma fuente que el panel web y que /docs/legal) y lo pinta.
// Que el texto venga del servidor evita tener copias en la app que se
// desactualizan y obligan a publicar una versión nueva en las tiendas.
export default function LegalDocumentScreen({ navigation, slug, fallbackTitle }) {
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/api/legal/documents/${slug}`)
      setDoc(data)
    } catch {
      setError('No se pudo cargar el documento. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [slug])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {doc?.title || fallbackTitle}
        </Text>
        {doc?.version ? <Text style={styles.version}>v{doc.version}</Text> : <View style={{ width: 32 }} />}
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}

      {!loading && error !== '' && (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>📄</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && error === '' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <MarkdownView content={doc?.content} />
          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.white, fontSize: 32, lineHeight: 34, fontWeight: '300' },
  headerTitle: { flex: 1, color: colors.white, fontSize: fontSize.md, fontWeight: '800' },
  version: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorIcon: { fontSize: 40, marginBottom: spacing.md },
  errorText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
})
