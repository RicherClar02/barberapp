# Política de Cookies — Panel web de Estilo

**Versión:** 1.0
**Última actualización:** 20 de agosto de 2026
**Ámbito:** esta política aplica **únicamente al panel web** de Estilo (https://appestilo.co). La aplicación móvil **no utiliza cookies**.

---

## 1. Responsable

**RC Studio** — Brayan Richer Claros Díaz
Cédula de ciudadanía 1.123.802.892
Calle 19 # 37K 03, Marsella, Villavicencio, Meta, Colombia
Correo: richerclarosdiaz@gmail.com

## 2. ¿Qué son las cookies?

Una **cookie** es un archivo de texto muy pequeño que un sitio web guarda en su navegador cuando usted lo visita. En cada visita posterior, el navegador devuelve esa información al sitio, lo que le permite recordar cosas como que usted ya inició sesión.

Junto a las cookies existen tecnologías equivalentes que también almacenan información en su navegador:

- **`localStorage`**: guarda datos en el navegador sin fecha de expiración automática, hasta que el sitio o usted los borren.
- **`sessionStorage`**: guarda datos que se eliminan al cerrar la pestaña.

El panel web de Estilo usa principalmente **`localStorage`**, no cookies de servidor. Esta política cubre ambas tecnologías, ya que cumplen la misma función y le otorgan a usted los mismos derechos.

## 3. Cookies y almacenamiento que utilizamos

Usamos **exclusivamente almacenamiento esencial**, indispensable para que el panel funcione.

| Nombre | Tipo | Finalidad | Duración |
|---|---|---|---|
| `estilo-auth` | `localStorage` (esencial) | Guarda su **token de sesión JWT** y los datos básicos de su perfil (nombre, rol) para mantenerlo autenticado mientras navega entre secciones del panel. Sin esto tendría que iniciar sesión en cada página. | Hasta que cierre sesión o borre los datos del navegador. El token expira automáticamente según la política del servidor. |

Eso es todo. No hay más entradas.

### 3.1 Naturaleza del token de sesión

El token JWT almacenado:

- Identifica su sesión ante el backend de Estilo.
- Tiene **expiración corta** y queda invalidado si usted cambia su contraseña.
- **No contiene su contraseña.**
- Se envía **únicamente** a los servidores de Estilo, nunca a terceros.

## 4. Cookies que NO utilizamos

Queremos ser explícitos al respecto. El panel web de Estilo **no utiliza**:

- ❌ **Cookies de rastreo de terceros** (Facebook Pixel, TikTok Pixel, LinkedIn Insight u otros).
- ❌ **Cookies publicitarias** ni de publicidad comportamental o remarketing.
- ❌ **Cookies analíticas de terceros** (Google Analytics, Hotjar, Mixpanel u otros).
- ❌ **Cookies de perfilado** para construir un perfil comercial suyo.
- ❌ **Fingerprinting** o huella digital del dispositivo con fines publicitarios.

**No vendemos ni compartimos con terceros la información almacenada en su navegador.**

## 5. Base legal

Al tratarse **únicamente de almacenamiento estrictamente necesario** para prestar un servicio que usted solicitó expresamente (iniciar sesión en el panel), no se requiere su consentimiento previo, conforme al artículo 5.3 de la Directiva 2002/58/CE (ePrivacy) y a las guías de la Superintendencia de Industria y Comercio sobre la Ley 1581 de 2012.

Por esta razón el panel **no muestra un banner de cookies**: no hay nada opcional que aceptar o rechazar. Si en el futuro incorporamos almacenamiento no esencial, le solicitaremos su consentimiento explícito antes de activarlo y actualizaremos esta política.

## 6. Recursos externos que carga el panel

El panel web carga tipografías desde **Google Fonts** (`fonts.googleapis.com` y `fonts.gstatic.com`) para su apariencia visual. Esta petición:

- **No instala cookies** en su navegador.
- Implica que Google recibe su dirección IP como parte de la solicitud HTTP, igual que ocurre con cualquier recurso web externo.
- No permite a Google identificarlo como usuario de Estilo.

No cargamos scripts, píxeles ni recursos de ningún otro dominio de terceros.

## 7. Cómo desactivar o eliminar el almacenamiento

Usted controla en todo momento lo que su navegador guarda.

### 7.1 Desde Estilo

Al pulsar **"Cerrar sesión"** en el panel, eliminamos inmediatamente la entrada `estilo-auth` de su navegador.

### 7.2 Desde su navegador

| Navegador | Ruta |
|---|---|
| **Google Chrome** | Configuración → Privacidad y seguridad → Borrar datos de navegación → *Cookies y otros datos de sitios* |
| **Mozilla Firefox** | Ajustes → Privacidad y seguridad → Cookies y datos del sitio → *Limpiar datos* |
| **Microsoft Edge** | Configuración → Cookies y permisos del sitio → Administrar y eliminar cookies y datos del sitio |
| **Safari (macOS)** | Safari → Ajustes → Privacidad → Gestionar datos de sitios web |
| **Safari (iOS)** | Ajustes → Safari → Borrar historial y datos de sitios web |

También puede usar el modo de navegación privada o incógnito: al cerrar la ventana, todo el almacenamiento se elimina automáticamente.

### 7.3 Consecuencia de desactivarlo

Si bloquea o elimina el almacenamiento local del dominio de Estilo, **el panel cerrará su sesión** y deberá volver a iniciarla. El sitio no dejará de funcionar, pero no podrá mantenerse autenticado entre páginas.

## 8. Cambios a esta política

Si modificamos el uso de cookies o almacenamiento —especialmente si incorporamos alguna categoría no esencial— publicaremos la nueva versión en https://appestilo.co/cookies y se lo notificaremos con **30 días de anticipación**. Cada versión queda identificada con número y fecha.

## 9. Más información

- [Política de Privacidad](./politica-de-privacidad.md)
- [Términos y Condiciones](./terminos-y-condiciones.md)

Para dudas sobre esta política: **richerclarosdiaz@gmail.com**

---

*Documento versión 1.0 — 20 de agosto de 2026 — RC Studio*
