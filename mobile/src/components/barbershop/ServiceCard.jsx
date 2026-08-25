import { View, Text, Image, StyleSheet } from 'react-native'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { colors, fontSize, spacing, radius } from '../../constants/theme'
import { formatCurrency } from '../../utils/formatters'

export default function ServiceCard({ service, onBook }) {
  return (
    <Card style={styles.card} padding={false}>
      {service?.image ? (
        <Image source={{ uri: service.image }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Text style={{ fontSize: 32 }}>✂️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{service?.name}</Text>
        {service?.description && (
          <Text style={styles.desc} numberOfLines={2}>{service.description}</Text>
        )}
        <View style={styles.row}>
          <View>
            <Text style={styles.price}>{formatCurrency(service?.price)}</Text>
            <Text style={styles.duration}>⏱ 40 min</Text>
          </View>
          <Button size="sm" onPress={onBook}>Reservar</Button>
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  image: { width: '100%', height: 140, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  imageFallback: { backgroundColor: colors.graySoft, alignItems: 'center', justifyContent: 'center' },
  info: { padding: spacing.md },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  desc: { fontSize: fontSize.xs, color: colors.secondary, marginBottom: spacing.sm, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: fontSize.lg, fontWeight: '800', color: colors.accent },
  duration: { fontSize: fontSize.xs, color: colors.secondary, marginTop: 2 },
})
