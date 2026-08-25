import { useEffect, useRef } from 'react'
import { View, Text, Animated, StyleSheet, Image } from 'react-native'
import { colors, fontSize } from '../../constants/theme'

export default function LoadingScreen() {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ translateY }], alignItems: 'center' }}>
        <Image
          source={require('../../../assets/Estilo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Tu barbería perfecta, a un toque</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 220, height: 126, borderRadius: 16, marginBottom: 16 },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: 8,
    fontStyle: 'italic',
  },
})
