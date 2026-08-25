import LegalDocumentScreen from './LegalDocumentScreen'

export default function Terms({ navigation }) {
  return (
    <LegalDocumentScreen
      navigation={navigation}
      slug="terms"
      fallbackTitle="Términos y Condiciones"
    />
  )
}
