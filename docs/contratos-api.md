# Desajustes de contrato entre frontend y API

Barrido de lectura hecho sobre `mobile/src` y `web/src`, comparando cada llamada
contra el `select` de Prisma del servicio y contra lo que arma el controlador.

**33 desajustes confirmados.** No son solo nombres de campo: hay tres endpoints que
no existen y tres llamadas que mandan el id equivocado.

Dato que ordena la prioridad: **la web ya resuelve bien varios de estos casos y el
móvil no**. `web/src/pages/barber/MyCard.jsx:27` pide `/api/barbers/my` para obtener
el id de perfil antes de usarlo, y `web/src/pages/barber/Appointments.jsx:29` lleva un
comentario que explica que son dos identificadores distintos. Esa corrección nunca
llegó al móvil. Cuando haya que arreglar algo del móvil, el patrón se copia de la web.

## Estado

| Parte | Estado |
|---|---|
| Renombres de lectura | Corregidos |
| Id de perfil de barbero (móvil) | Corregido, copiando el patrón de la web |
| Secciones sobre rutas inexistentes | Ocultadas en el cliente; **falta backend** |
| `PUT /api/barbers/:id` desde el móvil | **Bloqueado, necesita decisión de backend** |

## Pendiente que abrió el backend: el estado `EXPIRED`

`AppointmentStatus` ya incluye `EXPIRED` (`backend/prisma/schema.prisma:243`). **Los
dos frontends todavía no lo conocen**, así que una cita vencida se ve rota o
desaparece. Falta, y no se hizo en esta tanda:

- `web/src/components/ui/Badge.jsx` → entrada `EXPIRED` en `STATUS_MAP`, etiqueta
  «Vencida». Sin ella el badge imprime el literal `EXPIRED` en gris.
- `web/src/utils/formatters.js` → `getStatusColor()` y el mapa de etiquetas.
- `web/src/pages/owner/Agenda.jsx` → `<option>` del filtro y mapa de tinte de fila.
- `web/src/pages/barber/Agenda.jsx` → mapa de tinte de fila.
- `web/src/pages/barber/Appointments.jsx` → la pestaña «Próximas» filtra
  `PENDING,CONFIRMED,IN_PROGRESS`; las vencidas desaparecen de todas las pestañas.
- Los botones de acción condicionados a `status === 'PENDING'` deben mostrarse también
  en `EXPIRED`, o el barbero se queda sin forma de resolver una cita vencida.
- Móvil: `mobile/src/constants/theme.js` (`STATUS_COLORS`) y
  `mobile/src/utils/formatters.js`.

---

## 1. Pendiente de backend

Lo único que no se puede resolver desde el frontend.

### 1.1 Rutas que no existen

Las tres se llaman desde pantallas reales y devuelven 404. Las secciones que
alimentaban quedaron ocultas en el cliente, con un comentario en el código que
nombra la ruta que falta. Cuando existan, se vuelven a mostrar.

| Ruta que se llama | Desde | Qué alimentaba |
|---|---|---|
| `GET /api/payments/barber/:id` | `mobile/src/screens/barber/EarningsScreen.jsx:33` | Lista de transacciones del barbero |
| `GET /api/loyalty/my` | `mobile/src/screens/client/ProfileScreen.jsx:32` | Fidelización del cliente |
| `GET /api/loyalty/barber/:id` | `web/src/pages/barber/Earnings.jsx:35` | Ranking de clientes fieles |

Detalle de cada una:

- **`/api/payments/barber/:id`** — `backend/src/routes/payment.routes.js` tiene
  `cash/:appointmentId`, `appointment/:appointmentId`, `shop/:shopId`,
  `summary/:shopId`, `refund/:appointmentId`, `stripe/*` y `epayco/*`. No hay
  ninguna ruta por barbero.
- **`/api/loyalty/my`** — `backend/src/routes/loyalty.routes.js` tiene `/:shopId`,
  `/shop/:shopId/clients` y `/redeem`. La llamada cae en la ruta comodín `/:shopId`
  con `shopId = "my"`.
- **`/api/loyalty/barber/:id`** — son dos segmentos y la ruta comodín es de uno solo,
  así que no hay coincidencia posible.

### 1.2 `POST /api/upload/user-avatar/:userId` — **resuelto**

`mobile/src/screens/client/ProfileScreen.jsx` subía ahí la foto de perfil del cliente
y la ruta no existía. Ya está: `backend/src/routes/upload.routes.js:179` la monta con
`uploadAvatar.single('file')`, que coincide con el campo que ahora manda el móvil.
La foto de perfil del cliente funciona de punta a punta.

### 1.3 `PUT /api/barbers/:id` es `requireRole('OWNER')`

`mobile/src/screens/barber/MyCardScreen.jsx:28` deja que el barbero edite su
especialidad y su biografía llamando a esa ruta. Dos problemas a la vez:

1. La ruta exige rol OWNER (`backend/src/routes/barber.routes.js:184`), así que un
   barbero recibe 403 sin importar qué mande.
2. El servicio busca por id de perfil (`backend/src/services/barber.service.js:115`)
   y el móvil manda `user.id`.

Cambiar el id no alcanza. **Hace falta decidir en backend** si esa ruta acepta que un
BARBER se edite a sí mismo, o si el móvil deja de ofrecer esa edición. Hasta
entonces queda como está, sin tocar.

---

## 2. Desajustes por pantalla

### Móvil — MyCardScreen

`GET /api/barbers/card/:userId` devuelve `{ barber, today, upcomingAppointments,
recentReviews }`. El componente hacía `card = data?.barber`, así que todo lo que no
viviera dentro de `barber` quedaba fuera de alcance.

| Línea | Leía | Real | Efecto |
|---|---|---|---|
| 96 | `card.reviewCount` | `card.totalReviews` | siempre 0 reseñas |
| 97-98 | `card.barbershop?.name` | `card.barbershopName` (string plano) | no mostraba la barbería |
| 107 | `card.today?.total` | `data.today.totalCuts` | siempre 0 |
| 112 | `card.today?.earnings` | `data.today.earningsToday` | siempre $0 |
| 117 | `card.nextAppointment` | `data.today.nextAppointment` | siempre «—» |
| 136-139 | `card.reviews` | `data.recentReviews` | no listaba reseñas |
| 161-164 | `card.services` | **no existe en la respuesta** | sección muerta, ahora oculta |
| 42 | envía `fd.append('avatar', …)` | multer espera `'file'` | 400 |
| 44 | `barber-avatar/${user.id}` | espera `barber.id` | 404 |
| 36-37 | `ImagePicker.MediaTypeOptions.Images` | `mediaTypes: ['images']` | API vieja de Expo SDK 54 |
| 28 | `PUT /api/barbers/${user.id}` | ver 1.3 | **sin tocar** |

### Móvil — EarningsScreen

`GET /api/earnings/barber/:barberId` responde `{ earnings: { totalEarned, cutsCount,
period, barberPercentage, breakdown } }`.

| Línea | Leía | Real | Efecto |
|---|---|---|---|
| 37 | `statsData?.stats` | `statsData.earnings` | **todos** los campos indefinidos |
| 81 | `stats.barberEarnings` / `stats.totalEarnings` | `totalEarned` | $0 |
| 87 | `stats.completedCuts` / `stats.cuts` | `cutsCount` | «0 completadas» |
| 87 | `stats.avgTicket` | **no existe** | tarjeta quitada |
| 133 | `stats.barberPct` | `barberPercentage` | caía al 60 por defecto |
| 26 | `/api/earnings/barber/${user.id}` | espera `barber.id` | 400 |
| 33 | `GET /api/payments/barber/:id` | ver 1.1 | sección oculta |

Esto explica el síntoma «dice 0 completadas pero lista cosas»: `cutsCount` no se leía
nunca y la lista se alimentaba de un 404 cuyo fallback era un arreglo vacío.

### Móvil — BookingFlow

`GET /api/barbers/shop/:shopId` devuelve `{ barbers }`, cada uno con los campos de
`Barber` más `user: { name, avatar, phone }` anidado y `avgRating` calculado. El
modelo `Barber` no tiene `name`, ni `avatar`, ni `rating`.

| Línea | Leía | Real |
|---|---|---|
| 210 | `b.name` | `b.user.name` |
| 212 | `b.rating` | `b.avgRating` |
| 208 | ícono fijo | `b.user.avatar`, que no se pedía |

### Móvil — BarbershopDetail

| Línea | Leía | Real |
|---|---|---|
| 116, 117, 212, 213 | `shop.rating` | `shop.avgRating` |
| 188 | `b.rating` | `b.avgRating` |

No hay columna `rating` en `Barbershop`: el promedio se calcula al vuelo en
`backend/src/services/barbershop.service.js:174` y se expone como `avgRating`.

### Móvil — BarbershopCard

| Línea | Leía | Real |
|---|---|---|
| 42 | `shop.rating` | `shop.avgRating` |

### Móvil — ProfileScreen

| Línea | Leía / enviaba | Real |
|---|---|---|
| 24, 159, 189 | `user?.whatsapp` | `user.whatsappNumber` |
| 76 | `fd.append('avatar', …)` | `'file'` |
| 79 | `POST /api/upload/user-avatar/:id` | ver 1.2 |
| 32 | `GET /api/loyalty/my` | ver 1.1 |
| 68-69 | `MediaTypeOptions.Images` | `mediaTypes: ['images']` |

El WhatsApp **se guardaba bien**: la ruta existe, el validador lo acepta y la
allowlist del servicio lo incluye. Lo que fallaba era la relectura.

### Móvil — AppointmentDetail

| Línea | Leía | Real |
|---|---|---|
| 71, 84, 87 | `barbershop.whatsapp` | `barbershop.phone` |

`Barbershop` no tiene columna `whatsapp`. Decisión tomada: no se agrega, se lee
`phone`.

### Web — barber/Earnings

| Línea | Leía | Real | Estado |
|---|---|---|---|
| 35 | `GET /api/loyalty/barber/:id` | ver 1.1 | sección oculta |
| 40 | `earningsData?.breakdown` | `earningsData.earnings.breakdown` | **sin corregir, a propósito** |

La tabla de cortes de esta pantalla está mal en dos niveles a la vez, y por eso no se
tocó en esta tanda:

1. La ruta del arreglo: `breakdown` cuelga de `earnings`, no de la raíz.
2. Los campos de cada fila también están cambiados. El servicio devuelve
   `{ date, startTime, amount, clientName, service }` y la tabla lee `item.serviceName`,
   `item.price` y `item.barberEarning`, que no existen.

Corregir solo la ruta haría aparecer filas con tres columnas vacías, que es peor que
la lista vacía de hoy. Y corregir los campos obliga a decidir qué significan las
columnas *Precio* y *Mi ganancia*, porque `amount` **ya es la parte del barbero**
(`totalPrice * barberPercentage / 100`), no el precio del servicio. Eso es una
decisión de producto, no un renombre.

**Consecuencia para el móvil:** `breakdown` es el dato que debería alimentar la lista
de cortes de `EarningsScreen`, en vez de la ruta inexistente
`/api/payments/barber/:id`. No se hizo porque el patrón equivalente de la web también
está roto: no había de dónde copiarlo.

### Web — barber/MyCard

| Línea | Leía | Real |
|---|---|---|
| 36 | `cardData?.barbershop` | `cardData.barber.barbershopName` |

### Web — owner/Dashboard y superadmin/Dashboard: **falsa alarma**

Estaban en la lista como `b.rating` → `b.avgRating`. **Es incorrecto: los dos leen
bien y no se tocaron.**

No se alimentan de `/api/barbers/shop/:shopId` sino de analytics, que sí expone el
campo como `rating`:

- `web/src/pages/owner/Dashboard.jsx:294` viene de `/api/analytics/shop/:id/barbers`
  → `backend/src/services/analytics.service.js:270` devuelve `rating`.
- `web/src/pages/superadmin/Dashboard.jsx:128` viene de `/api/analytics/platform`
  → `backend/src/services/analytics.service.js:319` devuelve `rating`.

Renombrarlos a `avgRating` habría roto dos pantallas que funcionan. La lección es que
`rating` vs `avgRating` depende del endpoint, no del concepto: los servicios de
analytics promedian y publican `rating`; `barbershop.service.js` y `barber.service.js`
publican `avgRating`.

`web/src/pages/owner/Dashboard.jsx:106` ya usaba `overview?.avgRating` bien, desde
`/api/analytics/shop/:id/overview`.

---

## 3. Secciones sin barrer — pendientes

El barrido cubrió **todo `mobile/src`** y las pantallas de web con más tráfico. Estas
quedaron **muestreadas, no auditadas**. Es probable que aparezcan más desajustes:

- `web/src/pages/superadmin/*` salvo `Dashboard.jsx`
- `web/src/pages/owner/Advertising.jsx`
- `web/src/pages/owner/Offers.jsx`
- `web/src/pages/owner/Services.jsx`
- `web/src/pages/owner/Settings.jsx`
- Todo lo que toca `waitlist`, `schedules` y `config`
- `legal`, `locations` y `chatbot` en los dos lados

---

## 4. Cómo se verificó

Leyendo el `select` de Prisma de cada servicio, el objeto que arma el controlador y
los campos que lee el componente. **No se levantó el backend ni la app**, así que
ningún 404 está confirmado contra un servidor real: todos se deducen de la lista de
rutas montadas en `backend/server.js` y de los `router.<método>` de cada archivo de
rutas.

Dos deducciones que conviene confirmar cuando haya un backend corriendo:

- `GET /api/loyalty/my` cae en la ruta comodín `/:shopId`; no se comprobó si Express
  responde 400, 404 o una lista vacía.
- `stats.avgTicket` y `card.services` no están en el servicio correspondiente. No se
  descarta que existan en otro endpoint que la pantalla debería llamar y no llama.

## 6. Dato de relleno encontrado de paso — sin corregir

`web/src/pages/barber/Earnings.jsx:44-61` arma el gráfico con **`Math.random()`**:

```js
if (period === 'week') {
  return Array.from({ length: 7 }, (_, i) => ({
    label: format(subDays(new Date(), 6 - i), 'EEE', { locale: es }),
    ganancia: Math.floor(Math.random() * 80000),
  }))
}
```

Los tres períodos (hoy, semana, mes) generan números al azar en cada render. Esto
explica que la pantalla mostrara ganancias de semanas 2, 3 y 4 sin una sola cita en la
base. No se tocó porque excede el alcance de un renombre: hay que decidir con qué dato
real se dibuja el gráfico.
