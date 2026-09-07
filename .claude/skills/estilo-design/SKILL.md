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
| destructive | `#EF4444` | `-destructive` | `colors.destructive` |
| whatsapp | `#25D366` | `-whatsapp` | `colors.whatsapp` |

- **web:** `web/tailwind.config.js` → `theme.extend.colors`
- **móvil:** `mobile/src/constants/theme.js` → `export const colors`

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

- **web:** `lucide-react` (ya instalado).
- **móvil:** `Feather` de `@expo/vector-icons` — llega como dependencia transitiva de
  `expo` (`@expo/vector-icons@15.1.1`), no hace falta instalarla.
  `import Feather from '@expo/vector-icons/Feather'`

**Tamaños: 16 / 20 / 24.** Nada más.
16 inline junto a texto · 20 botones y filas · 24 headers y tab bar.

**Color siempre desde tokens:** web `className="text-muted"`; móvil
`color={colors.muted}`. Nunca un hex en el `color` de un ícono.

### Tabla de equivalencia concepto → Feather → lucide

Solo nombres que existan en **las dos** librerías, para que web y móvil no se separen.

| Concepto | Feather (móvil) | lucide (web) |
|---|---|---|
| _(vacía — se llena en el paso siguiente)_ | | |

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

## Cómo trabajamos

Un paso a la vez, se muestra y se espera. Rama `feat/iconos-y-skill-diseno`, nunca
`main`. Sin push. Si encuentras algo roto que no te pidieron: repórtalo, no lo
arregles.
