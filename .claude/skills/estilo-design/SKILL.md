---
name: estilo-design
description: Reglas de diseño e interfaz de Estilo (web/ y mobile/). Léela ENTERA antes de tocar cualquier archivo de web/src o mobile/src — antes de crear un componente, escribir un texto de UI, elegir un color, un espaciado, un radio o un ícono. La identidad ya existe: esta skill la conserva, no la rediseña.
---

# Diseño de Estilo

App de reservas para barberías en Colombia. Monorepo: `backend/` (no se toca desde
acá), `web/` (React + Vite + Tailwind), `mobile/` (React Native + Expo SDK 54).
Está en producción con usuarios reales.

## Tokens

Paleta marrón cuero. **Fuente única en cada lado — no hay una tercera.**

| Token | Hex | web | móvil |
|---|---|---|---|
| primary | `#4A2C0A` | `text-primary` `bg-primary` | `colors.primary` |
| secondary | `#8B5E3C` | `-secondary` | `colors.secondary` |
| accent | `#C49A6C` | `-accent` | `colors.accent` |
| cream | `#F5EFE6` | `-cream` | `colors.cream` |
| muted | `#9E8670` | `-muted` | `colors.muted` |
| gray-soft | `#E8E0D8` | `-gray-soft` | `colors.graySoft` |
| black-soft | `#1A1A1A` | `-black-soft` | `colors.black` |
| success | `#27AE60` | `-success` | `colors.success` |
| warning | `#A65E2E` | `-warning` | `colors.warning` |
| warning-bg | `#F0DFD0` | `-warning-bg` | `colors.warningBg` |
| destructive | `#EF4444` | `-destructive` | `colors.destructive` |
| whatsapp | `#25D366` | `-whatsapp` | `colors.whatsapp` |

- **web:** `web/tailwind.config.js` → `theme.extend.colors`
- **móvil:** `mobile/src/constants/theme.js` → `export const colors`

**`warning` es «requiere acción», no «error».** Es el hueco que faltaba entre
`success` y `destructive`: avisos, suscripción por vencer, confirmaciones pendientes y
citas vencidas. Terracota — `secondary` corrido hacia el rojo — para que pertenezca a
la paleta marrón cuero y no se confunda con el ámbar de `PENDING` ni con `destructive`.
`warning` es el texto y el ícono; `warning-bg` es el fondo de la etiqueta.
Lo que está roto va en `destructive`; lo que hay que resolver va en `warning`.

Tipografía: **Poppins** títulos, **Inter** cuerpo.
web `font-heading` / `font-body`; móvil `typography.h1|h2|h3|body|bodyBold|caption`
y `fontFamily.*` (`mobile/src/constants/theme.js`).

**NUNCA un color en duro.** Ni hex, ni `bg-red-500`, ni `text-gray-500`. Si el color
que necesitas no está en la tabla, no lo inventes: pregunta.
Única excepción, y solo porque la librería no acepta clases: los `fill`/`stroke` de
Recharts en web. Aun ahí el valor sale de la paleta de arriba.

## Español colombiano

**Nunca voseo.** "puedes", no "podés". "elige", no "elegí". "guarda", no "guardá".
"toca", no "tocá". "vuelve", no "volvé". "revisa", no "revisá". "intenta", no
"intentá". "prueba", no "probá". "cuéntale", no "contale". "aquí", no "acá".
Tuteo neutro colombiano en toda la UI.

Vocabulario: se dice **cita**, no "turno". **barbería**, no "local".

## Íconos

**NUNCA un emoji como ícono.** Ni en JSX, ni en un string, ni en un campo `icon:`
de un array, ni como prop. Tampoco símbolos tipográficos sueltos (`✕ ✓ ★ ‹ › ➤ ▾ ●`)
en lugar de un ícono.

- **Móvil: `Feather` de `@expo/vector-icons`, sin excepciones.** Llega como
  dependencia transitiva de `expo` (`@expo/vector-icons@15.1.1`), no hace falta
  instalarla. `import Feather from '@expo/vector-icons/Feather'`
- **Web: `lucide-react`** (ya instalado). **Si lucide tiene un ícono mejor que el
  equivalente Feather, se usa el mejor. Nunca se degrada web para igualar al móvil.**
  La tabla lista los dos nombres por concepto y anota cuándo difieren y por qué.

**Feather es una fuente, no SVG.** Se pinta con un glifo de `Feather.ttf`, así que
no hay control de grosor de trazo (`strokeWidth` no existe: lo que llega es
`size` y `color`) y puede haber un parpadeo de glifos sin cargar en el primer
render, antes de que la fuente esté lista. lucide en web sí es SVG. Por eso los
dos lados nunca van a quedar pixel a pixel iguales, y está bien.

**Tamaños de interfaz: 16 / 20 / 24.** Nada más.
16 inline junto a texto · 20 botones y filas · 24 headers y tab bar.

**Arte de estado vacío: 48.** Aparte de la escala de interfaz, y solo ahí: el ícono
grande y centrado de una pantalla sin datos. No uses 48 en una fila, un botón ni un
header.

**Color siempre desde tokens:** web `className="text-muted"`; móvil
`color={colors.muted}`. Nunca un hex en el `color` de un ícono.

### Tabla de equivalencia

| Concepto | Emoji que reemplaza | Feather (móvil) | lucide (web) | Tamaño |
|---|---|---|---|---|
| Barbería / corte / barbero | ✂️ ✂ | `scissors` | `Scissors` | 16 · 48 vacío |
| Negocio / rol dueño | 🏪 🏢 | `briefcase` | `Store` ⚠ | 20 |
| Cliente / perfil | 👤 | `user` | `User` | 24 tab · 20 fila |
| Clientes / usuarios | 👥 | `users` | `Users` | 20 |
| Inicio | 🏠 | `home` | `Home` | 24 tab |
| Cita / fecha / calendario | 📅 🗓️ | `calendar` | `Calendar` | 20 · 24 tab |
| Lista / agenda del día | 📋 | `list` | `List` | 20 · 24 tab |
| Hora / horario / historial | 🕐 ⏰ ⏱️ | `clock` | `Clock` | 16 |
| Refrescar / reintentar | ⟳ | `refresh-cw` | `RefreshCw` | 20 |
| Dinero / ganancias | 💰 | `dollar-sign` | `DollarSign` | 20 · 24 tab |
| Pago / suscripción | 💳 | `credit-card` | `CreditCard` | 20 |
| Carné del barbero | 🪪 | `credit-card` | — solo móvil | 24 tab |
| Oferta / cupón | 🎫 | `tag` | `Tag` | 16 |
| Fidelización / corte gratis | 🎁 | `gift` | `Gift` | 16 |
| Calificación | ⭐ ★ ☆ | `star` | `Star` | 16 |
| Dirección / ciudad | 📍 📌 | `map-pin` | `MapPin` | 16 |
| Mapa | 🗺️ | `map` | `Map` | 24 tab |
| Usar mi ubicación (GPS) | 📡 | `crosshair` | `Crosshair` | 20 |
| Llamar | 📞 | `phone` | `Phone` | 20 |
| Teléfono (dato) | 📱 | `smartphone` | `Smartphone` | 16 |
| WhatsApp / chat | 💬 | `message-circle` | `MessageCircle` | 20 · 24 FAB |
| Correo | ✉️ 📧 | `mail` | `Mail` | 16 |
| Notificaciones | 🔔 | `bell` | `Bell` | 24 header |
| Buscar | 🔍 | `search` | `Search` | 20 |
| Contraseña / privacidad | 🔒 | `lock` | `Lock` | 16 |
| Ver contraseña | 👁️ | `eye` | `Eye` | 20 |
| Ocultar contraseña | 👁️‍🗨️ 🙈 | `eye-off` | `EyeOff` | 20 |
| Cambiar foto | 📷 | `camera` | `Camera` | 16 |
| Subir archivo | 📁 | `upload` | `Upload` | 20 · 48 dropzone |
| Descargar mis datos | 📥 | `download` | `Download` | 20 |
| Imagen ausente | — | `image` | `Image` | 24 · 48 |
| Anuncios / publicidad | 📢 | `image` ⚠ | `Megaphone` ⚠ | 20 · 48 vacío |
| Premium | 👑 | `award` ⚠ | `Crown` ⚠ | 16 |
| Editar | ✏️ ✏ | `edit-2` | `Edit2` | 20 |
| Eliminar | 🗑️ | `trash-2` | `Trash2` | 20 |
| Enviar | ➤ | `send` | `Send` | 20 |
| Documento legal | 📄 | `file-text` | `FileText` | 16 · 48 vacío |
| Aviso informativo | 📋 | `info` | `Info` | 16 |
| Advertencia | ⚠️ ⚠ | `alert-triangle` | `AlertTriangle` | 16 · 20 |
| Éxito / confirmado | ✅ | `check-circle` | `CheckCircle` | 20 |
| Check simple / verificado | ✓ | `check` | `Check` | 16 |
| Cancelado / rechazado | ❌ | `x-circle` | `XCircle` | 20 |
| Cerrar | ✕ | `x` | `X` | 20 |
| Atrás | ‹ | `chevron-left` | `ChevronLeft` | 24 |
| Avanzar / chevron de fila | › | `chevron-right` | `ChevronRight` | 16 · 24 |
| Desplegable | ▾ | `chevron-down` | `ChevronDown` | 16 |
| Mañana (saludo) | ☀️ | `sun` | `Sun` | 16 |
| Noche (saludo) | 🌙 | `moon` | `Moon` | 16 |

**⚠ Los cuatro casos donde los dos lados difieren, y por qué:**

- **Negocio:** Feather no tiene `store`. Móvil usa `briefcase`; **web se queda con
  `Store`**, que es el ícono correcto y ya está en uso. No se degrada web.
- **Anuncios:** Feather no tiene `megaphone`. Móvil usa `image` (el anuncio es una
  pieza gráfica); web usa `Megaphone`.
- **Premium:** Feather no tiene `crown`. Móvil usa `award`; web usa `Crown`.
- **Carné del barbero:** solo existe en móvil (pestaña del barbero), así que no hay
  nada que igualar. `credit-card` no colisiona con "pago", que vive solo en web.

### Lo que NO es un ícono

- **Destacado** (antes ✨): etiqueta de texto con `colors.accent`. Sin ícono.
- **Estado en línea** (antes 🟢): `View` circular con `colors.success`. Sin ícono.
  Lo mismo para el `●` de activo/inactivo en web: punto de color con token.
- **Bandera de Colombia** (🇨🇴): ninguna de las dos librerías trae banderas de país.
  En el prefijo `+57` va solo el texto.
- **Saludo por hora:** `getGreetingEmoji()` se elimina completo. Feather no tiene
  `cloud-sun` para la tarde, y el saludo no necesita ícono.

**Excepción — copy narrativo de marca.** Un emoji dentro de una frase de marca no es
un ícono y se queda: "Hecho en Villavicencio, Colombia 🇨🇴" en `PublicLayout.jsx` y
`Landing.jsx`. La regla prohíbe el emoji **como ícono**, no el emoji dentro de un
texto que se lee como texto.

## Reusa, no reimplementes

Antes de escribir a mano un botón, un input, un estado vacío, una tarjeta de stat o
una tabla: **usa el que ya existe.** Hay componentes escritos, funcionando, que nadie
llama mientras las pantallas los reimplementan.

**Sin usar hoy — úsalos:**

| Componente | Props |
|---|---|
| `web/src/components/ui/StatCard.jsx` | `icon, title, value, subtitle, trend, trendUp` |
| `web/src/components/ui/Table.jsx` | `columns, data, loading, emptyMessage` |
| `mobile/src/components/ui/Badge.jsx` | `status` |
| `mobile/src/components/ui/EmptyState.jsx` | `icon, title, subtitle, actionLabel, onAction` |
| `mobile/src/components/ui/Input.jsx` | `label, value, onChangeText, placeholder, secureTextEntry, error, keyboardType, autoCapitalize, leftIcon, multiline, numberOfLines, style` |

**En uso — respétalos:**

| web | Props |
|---|---|
| `Button` | `children, variant='primary', size='md', loading, className, ...props` |
| `Card` | `children, className, title, action` |
| `Modal` | `open, onClose, title, children, footer` |
| `Input` | `label, error, icon, className, ...props` |
| `Badge` | `status, plan, label, className` |
| `ConfirmDialog` | `open, title, message, confirmLabel, cancelLabel, confirmVariant, onConfirm, onCancel, loading` |
| `ImageUploader` | `uploadUrl, currentUrl, onSuccess, accept, maxSizeMB, label, className` |
| `Skeleton` | `className` · `SkeletonCard({lines})` `SkeletonTable({rows,cols})` `SkeletonStat()` |

| móvil | Props |
|---|---|
| `Button` | `children, onPress, variant, size, loading, disabled, fullWidth, style` |
| `Card` | `children, onPress, style, padding` |
| `CitySelectorModal` | `visible, onClose, onSelect, defaultCity, onSetDefault` |
| `LoadingScreen` | — |
| `MarkdownView` | `content` |

## Escala de espaciado y radio (la real, no la ideal)

**Los dos lados no comparten escala. No la unifiques por tu cuenta.**
`radius.md` = **12px** en móvil; `rounded-lg` = **8px** en web. Son los dos más usados
de cada lado y no son el mismo valor. Documentado, sin tocar.

**Móvil** — `spacing` y `radius` de `theme.js`, y se usan de verdad (609 llamadas):

```
spacing  xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48
radius   sm 8 · md 12 · lg 16 · xl 24 · full 999
```
Los más usados: `spacing.sm`, `spacing.md`, `spacing.lg`; `radius.md`, `radius.sm`.
Usa el token. Un número crudo solo para micro-ajustes por debajo de `spacing.xs`
(2, 3) — nunca para un `borderRadius`, que hoy tiene 41 valores sueltos sin escala.

**Web** — escala Tailwind. La que ya existe:

```
padding   px-3 py-2.5 (el control/celda estándar) · px-4 · p-3 · p-4 · p-6
gap       gap-2 · gap-3 · gap-1 · gap-4
margin    mb-4 · mb-2 · mt-1 · mb-3 · mt-4
radio     rounded-lg (default) · rounded-full (pills, avatares) · rounded-xl (cards)
```
Fuera de esa lista es un caso suelto: justifícalo o usa el de la escala.

## Deuda conocida — NO la arregles de paso

**El color de un estado tiene hoy cuatro fuentes que no coinciden:**

1. `mobile/src/constants/theme.js` → `STATUS_COLORS`
2. `mobile/src/utils/formatters.js` → `getStatusColor()` (devuelve hex)
3. `web/src/components/ui/Badge.jsx` → `STATUS_MAP`
4. `web/src/utils/formatters.js` → `getStatusColor()` (devuelve clases Tailwind)

Los valores difieren entre sí (ej. `PENDING.text` es `#92400E` en `theme.js` y
`#854D0E` en `Badge.jsx`), y las dos `getStatusColor()` tienen el mismo nombre con
contratos distintos. Al tocar un estado, **usa la fuente que ya usa ese archivo** y
no consolides nada: es un cambio con su propio riesgo, y va en su propio paso.

**Y el problema de fondo: dos de esas cuatro fuentes están muertas, y la única viva de
web mezcla entidades.**

| Fuente | ¿Se usa? | Entidades que atiende |
|---|---|---|
| `web/.../Badge.jsx` → `STATUS_MAP` | Sí, 8 llamadas | **cita + pago + suscripción**, mezcladas |
| `web/utils/formatters.js` → `getStatusColor()` | **No, cero llamadas** | solo cita |
| `web/utils/formatters.js` → `getStatusLabel()` | **No, cero llamadas** | solo cita |
| `mobile/constants/theme.js` → `STATUS_COLORS` | Sí, 4 llamadas | solo cita |
| `mobile/utils/formatters.js` → `getStatusColor()` | **No, cero llamadas** | solo cita |
| `mobile/utils/formatters.js` → `getStatusLabel()` | Sí, 4 llamadas | solo cita |

`STATUS_MAP` recibe estados de cita (`PENDING`, `CONFIRMED`, `COMPLETED`…), de pago
(`REFUNDED`, `REFUND_PENDING`, desde `owner/Finances.jsx`) y de suscripción (`ACTIVE`),
todos en el mismo diccionario plano. Como las tres entidades comparten `PENDING` y
`COMPLETED` con significados distintos, **una etiqueta correcta para una entidad es
engañosa para otra**, y agregar un estado nuevo a una lo agrega a las tres.

### Decisión pendiente — la fuente única que debería existir

**No implementada. Se decide y se hace en su propio paso, nunca de paso.**

Un mapa **por plataforma**, partido **por entidad**, que devuelva **nombres de token**
— nunca un hex, nunca clases de Tailwind:

```
web/src/constants/estados.js     mobile/src/constants/estados.js
  CITA:         { EXPIRED: { fondo: 'warning-bg', texto: 'warning', etiqueta: 'Vencida' }, ... }
  PAGO:         { REFUND_PENDING: { ... }, ... }
  SUSCRIPCION:  { ACTIVE: { ... }, ... }
```

Tres reglas que hacen que valga la pena:

1. **El valor es el nombre del token, no el color.** Así el mapa no puede desviarse de
   la paleta: si un estado pide un token que no existe, revienta al escribirlo, no en
   producción.
2. **Una entrada por entidad.** `PENDING` de una cita y `PENDING` de un pago son dos
   filas distintas, con etiquetas distintas.
3. **Un mapa por plataforma, no uno compartido.** Web y móvil no comparten build ni
   escala; que las dos tablas se parezcan es responsabilidad de quien las edita, y el
   parecido se revisa leyendo dos archivos cortos.

La migración es el trabajo real: hay que repasar las 16 llamadas vivas y decidir, en
cada una, de qué entidad es el estado que está pintando.

**Los dos colores ajenos a la paleta.** `success` (`#27AE60`) y `destructive`
(`#EF4444`) vienen de librería, no de la familia marrón cuero: `#EF4444` es el rojo de
Tailwind. Conviven con la paleta pero no salen de ella. **Revisarlos después de
publicar**, no antes: hoy están en producción y cambiarlos toca todos los estados a la
vez.

## Cómo trabajamos

Un paso a la vez, se muestra y se espera. Rama `feat/iconos-y-skill-diseno`, nunca
`main`. Sin push. Si encuentras algo roto que no te pidieron: repórtalo, no lo
arregles.
