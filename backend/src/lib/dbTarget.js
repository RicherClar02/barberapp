// Toda conexión a la base anuncia a qué host va ANTES de consultar nada.
//
// El motivo es concreto: backend/.env tiene DATABASE_URL apuntando a
// localhost y, bajo otros nombres (SUPABASE_URL_SESSION, SUPABASE_URL_DIRECT),
// las credenciales de producción. Un script no dice a cuál de las dos pega, y
// el resultado de una consulta contra la base local se lee exactamente igual
// que el de una contra producción. Eso ya costó un diagnóstico equivocado: se
// reportaron 5 barberías de datos semilla como si fueran las de producción.
//
// El log de arranque tampoco ayudaba. Decía "DATABASE_URL: ✓ Cargado", que
// confirma que la variable existe y no dice nada de a dónde apunta — que es
// justo el dato que importa.
//
// NUNCA imprime usuario ni contraseña: solo host, puerto y nombre de base.

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0']

// Descompone la URL de conexión en algo mostrable, sin credenciales.
const describeDbTarget = (url = process.env.DATABASE_URL) => {
  if (!url) {
    return { ok: false, label: 'SIN DATABASE_URL definida', host: null, port: null, database: null, isLocal: false }
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const port = parsed.port || '5432'
    const database = parsed.pathname.replace(/^\//, '') || '(sin nombre)'
    const isLocal = LOCAL_HOSTS.includes(host) || host.endsWith('.local')

    return { ok: true, host, port, database, isLocal, label: `${host}:${port}/${database}` }
  } catch {
    // Una URL ilegible es peor que una remota: no se sabe a dónde va.
    return { ok: false, label: 'DATABASE_URL con formato ilegible', host: null, port: null, database: null, isLocal: false }
  }
}

// Imprime el destino. `context` es quién está conectando (el nombre del script
// o del módulo), para que en una salida larga se vea de dónde salió la línea.
//
// Lo remoto se marca distinto a propósito: la conexión peligrosa es la que
// toca producción sin que nadie lo haya pedido, y tiene que saltar a la vista
// en medio del ruido de un seed o una migración.
// Se anuncia una vez por destino distinto. El servidor pasa por acá dos veces
// (arranque y creación del pool) y repetir la misma línea solo agrega ruido.
// La clave es el destino, no el contexto: si un mismo proceso llegara a abrir
// DOS bases diferentes, las dos se imprimen — que es justo lo que hay que ver.
const yaAnunciados = new Set()

const announceDbTarget = (context, url = process.env.DATABASE_URL) => {
  const target = describeDbTarget(url)
  if (yaAnunciados.has(target.label)) return target
  yaAnunciados.add(target.label)

  if (!target.ok) {
    console.warn(`[db] ${context} → ${target.label}`)
    return target
  }

  const marca = target.isLocal ? 'LOCAL' : '⚠ REMOTA'
  console.log(`[db] ${context} → ${target.label}  [${marca}]`)
  return target
}

module.exports = { describeDbTarget, announceDbTarget }
