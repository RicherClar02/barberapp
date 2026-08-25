import LegalDocumentScreen from './LegalDocumentScreen'

export default function Privacy({ navigation }) {
  return (
    <LegalDocumentScreen
      navigation={navigation}
      slug="privacy"
      fallbackTitle="Política de Privacidad"
    />
  )
}
