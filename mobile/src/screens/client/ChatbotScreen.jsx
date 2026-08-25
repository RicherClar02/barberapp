import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/axios'
import { colors, fontSize, spacing, radius, shadows } from '../../constants/theme'

const QUICK_CHIPS = [
  { label: '💰 Ver precios', text: '¿Cuáles son los precios de los servicios?' },
  { label: '📅 Disponibilidad hoy', text: '¿Tienen disponibilidad para hoy?' },
  { label: '❌ Cancelar mi cita', text: 'Quiero cancelar mi próxima cita' },
  { label: '🕐 Horarios', text: '¿Cuáles son los horarios de atención?' },
]

function ChatBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Text style={{ fontSize: 16 }}>✂️</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>
        <Text style={[styles.bubbleTime, isUser && { color: 'rgba(255,255,255,0.6)' }]}>
          {new Date(message.createdAt || Date.now()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  )
}

export default function ChatbotScreen({ route, navigation }) {
  const { shopId, shopName } = route.params || {}
  const qc = useQueryClient()
  const flatRef = useRef(null)
  const [text, setText] = useState('')
  const [localMessages, setLocalMessages] = useState([])

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['chatbot-history', shopId],
    queryFn: () => api.get(`/api/chatbot/history/${shopId}`).then(r => r.data),
    enabled: !!shopId,
  })

  const allMessages = historyData?.messages?.length
    ? [...historyData.messages, ...localMessages.filter(m => !historyData.messages.find(h => h.id === m.id))]
    : localMessages

  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [allMessages.length])

  const sendMutation = useMutation({
    mutationFn: (msg) => api.post('/api/chatbot/message', { barbershopId: shopId, text: msg }),
    onSuccess: (res) => {
      setLocalMessages(prev => [...prev, res.data.message])
      qc.invalidateQueries({ queryKey: ['chatbot-history', shopId] })
    },
    onError: () => {
      setLocalMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.',
          createdAt: new Date().toISOString(),
        },
      ])
    },
  })

  const handleSend = (msg) => {
    const message = (msg || text).trim()
    if (!message) return
    const userMsg = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    }
    setLocalMessages(prev => [...prev, userMsg])
    setText('')
    sendMutation.mutate(message)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={{ fontSize: 20 }}>✂️</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Asistente ESTILO</Text>
          <Text style={styles.headerSub}>🟢 En línea · {shopName || 'Barbería'}</Text>
        </View>
      </View>

      {/* Messages */}
      {loadingHistory ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={allMessages}
          keyExtractor={(item, i) => item.id?.toString() || i.toString()}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✂️</Text>
              <Text style={styles.emptyTitle}>Hola, soy tu asistente</Text>
              <Text style={styles.emptyText}>
                Puedo ayudarte a reservar citas, consultar precios, horarios y más. ¿En qué te puedo ayudar?
              </Text>
            </View>
          }
          ListFooterComponent={
            sendMutation.isPending ? (
              <View style={[styles.bubbleRow]}>
                <View style={styles.botAvatar}><Text style={{ fontSize: 16 }}>✂️</Text></View>
                <View style={[styles.bubble, styles.bubbleBot, { paddingVertical: spacing.sm }]}>
                  <ActivityIndicator color={colors.muted} size="small" />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* Quick chips */}
      {allMessages.length === 0 && !loadingHistory && (
        <View style={styles.chipsContainer}>
          {QUICK_CHIPS.map(chip => (
            <TouchableOpacity
              key={chip.label}
              style={styles.chip}
              onPress={() => handleSend(chip.text)}
            >
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight + 8,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: colors.white, fontSize: 24, lineHeight: 28 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs, marginTop: 2 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  emptyContainer: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.shadowLight,
  },
  bubbleBot: {
    backgroundColor: colors.cream,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: fontSize.sm, color: colors.black, lineHeight: 20 },
  bubbleTextUser: { color: colors.white },
  bubbleTime: { fontSize: 10, color: colors.muted, marginTop: 4, textAlign: 'right' },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    ...shadows.shadowLight,
  },
  chipText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.graySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.black,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.graySoft },
  sendBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
})
