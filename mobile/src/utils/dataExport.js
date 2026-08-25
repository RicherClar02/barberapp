import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import api from '../api/axios'

// Derecho de portabilidad (Ley 1581 de 2012 / art. 20 GDPR): descarga el JSON
// con todos los datos del usuario, lo guarda en el almacenamiento de la app y
// abre el diálogo del sistema para que la persona lo envíe donde quiera.
//
// Devuelve { uri, shared } o lanza un Error con un mensaje ya legible.
export async function downloadMyData() {
  let data
  try {
    const response = await api.get('/api/users/me/data-export')
    data = response.data
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error('Alcanzaste el límite de descargas por hoy. Intenta mañana.')
    }
    throw new Error('No se pudieron obtener tus datos. Revisa tu conexión.')
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const file = new File(Paths.document, `estilo-mis-datos-${stamp}.json`)

  try {
    file.create({ overwrite: true })
    file.write(JSON.stringify(data, null, 2))
  } catch {
    throw new Error('No se pudo guardar el archivo en tu dispositivo.')
  }

  // Compartir es opcional: si el dispositivo no lo soporta, el archivo ya
  // quedó guardado y se informa la ruta.
  let shared = false
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Mis datos de Estilo',
      UTI: 'public.json',
    })
    shared = true
  }

  return { uri: file.uri, shared }
}
