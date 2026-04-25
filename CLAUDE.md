Contexto del proyecto BarberApp — Panel Web Admin
Continuación del panel web ya iniciado en /web
React + Vite + TailwindCSS + React Query + Zustand

YA IMPLEMENTADO EN /web:
- Estructura de carpetas completa
- axios.js con interceptores JWT
- authStore.js con Zustand
- formatters.js
- tailwind.config.js con colores BarberApp
- Layout: Sidebar + Header + Layout
- Componentes UI: Button, Card, Badge, StatCard, Table, Modal, Input
- Login page funcional
- App.jsx con rutas protegidas por rol
- Dashboard Owner con stats, agenda, barberos, gráfica
- Gestión de Barberos (Owner)
- Gestión de Servicios (Owner)
- Configuración de Barbería (Owner)

PALETA OFICIAL:
primary: #4A2C0A | secondary: #8B5E3C | accent: #C49A6C
cream: #F5EFE6 | white: #FFFFFF | gray-soft: #E8E0D8
error: #C0392B | success: #27AE60

BACKEND: http://localhost:3000
Duración fija por cita: 40 minutos

═══════════════════════════════════════════════════════
TAREA 1 — Agenda y Citas (Owner)
═══════════════════════════════════════════════════════

src/pages/owner/Agenda.jsx

Vista principal — Calendario semanal:
- Mostrar semana actual con navegación anterior/siguiente
- Columnas: una por barbero activo de la barbería
- Filas: horas del día (desde apertura hasta cierre)
- Cada cita ocupa su slot de 40 min con color según estado
- Al hacer click en una cita → modal con detalle completo
- Llamar: GET /api/calendar/shop/:shopId/day/:date

Modal detalle de cita:
- Nombre y foto del cliente
- Número de WhatsApp del cliente (clickeable → abre WhatsApp)
- Teléfono del cliente
- Servicio solicitado + precio
- Barbero asignado
- Hora inicio y fin
- Estado actual con badge
- Botones de acción según estado:
  * PENDING → "Confirmar" | "Cancelar"
  * CONFIRMED → "Completar" | "No-show" | "Cancelar"
  * COMPLETED → "Ver reseña" (si existe)

Vista alternativa — Lista del día:
- Toggle entre vista calendario y vista lista
- Lista ordenada por hora con misma info
- Filtros: por barbero, por estado

Llamar para acciones:
- PUT /api/appointments/:id/confirm
- PUT /api/appointments/:id/complete  
- PUT /api/appointments/:id/no-show
- PUT /api/appointments/:id/cancel

Lista de espera del día:
- Sección inferior mostrando waitlist activa
- Nombre cliente, servicio, posición, hora preferida
- Botón "Notificar" para avisar que hay espacio disponible

═══════════════════════════════════════════════════════
TAREA 2 — Finanzas (Owner)
═══════════════════════════════════════════════════════

src/pages/owner/Finances.jsx

Sección 1 — Resumen financiero (tabs: Hoy / Semana / Mes):
- Total ingresos del período
- Ganancias de la barbería (según % configurado)
- Ganancias totales pagadas a barberos
- Cantidad de cortes completados
- Ticket promedio por corte
- Comparación con período anterior con flecha ↑↓

Llamar: GET /api/earnings/shop/:shopId?period=today|week|month

Sección 2 — Gráfica de ingresos:
- BarChart con Recharts últimos 30 días
- Dos barras por día: ingresos barbería + ingresos barberos
- Colores: café oscuro para barbería, dorado para barberos

Sección 3 — Desglose por barbero (tabla):
- Nombre, cortes del período, ingresos generados,
  % del total, su ganancia personal
- Ordenado por mayor ingreso

Llamar: GET /api/analytics/shop/:shopId/barbers

Sección 4 — Historial de transacciones (tabla paginada):
- Fecha, cliente, barbero, servicio, monto, 
  método de pago, estado
- Filtros: fecha desde/hasta, barbero, estado
- Botón exportar (preparar datos para CSV)

Llamar: GET /api/payments/shop/:shopId

Sección 5 — Reembolsos pendientes:
- Lista de pagos con status PENDING de reembolso
- Botón "Procesar reembolso" por cada uno

═══════════════════════════════════════════════════════
TAREA 3 — Gestión de Ofertas (Owner)
═══════════════════════════════════════════════════════

src/pages/owner/Offers.jsx

- Lista de ofertas activas e inactivas en cards:
  título, descuento, servicio aplicable,
  fechas vigencia, usos actuales/máximos,
  cuenta regresiva si está activa (días:horas:minutos)

- Botón "Crear Oferta":
  Modal con form:
  * Título de la oferta
  * Tipo: % descuento o monto fijo COP
  * Servicio: todos o uno específico
  * Fecha inicio y fin
  * Código promocional (opcional)
  * Máximo de usos (opcional)

- Si plan BASIC → mostrar banner:
  "Las ofertas están disponibles desde el plan Estándar"
  Con botón "Mejorar plan"

- Si plan STANDARD → mostrar:
  "Puedes tener 1 oferta activa simultáneamente"

- Indicador visual de cuenta regresiva en cada oferta activa

Llamar:
- GET /api/offers/shop/:shopId
- POST /api/offers
- PUT /api/offers/:id
- DELETE /api/offers/:id

═══════════════════════════════════════════════════════
TAREA 4 — Publicidad (Owner)
═══════════════════════════════════════════════════════

src/pages/owner/Advertising.jsx

- Explicación del sistema de publicidad:
  "Tu anuncio aparece primero en la app con video 
   o imagen. Llega a más clientes."

- Lista de anuncios con stats:
  título, tipo (video/imagen), fechas,
  vistas, clicks, estado (activo/pendiente/vencido)

- Botón "Crear Anuncio":
  Modal con:
  * Título del anuncio
  * Subir imagen o video (hasta 50MB)
    Llamar POST /api/upload/ad-media/:adId
  * Fecha inicio y fin
  * Estado: "Pendiente de aprobación por BarberApp Admin"

- Banner informativo:
  "Una vez creado el anuncio, el equipo de BarberApp
   lo revisará y activará tras confirmar el pago."

Llamar:
- GET /api/ads/shop/:shopId
- POST /api/ads
- PUT /api/ads/:id

═══════════════════════════════════════════════════════
TAREA 5 — Panel Super Admin completo
═══════════════════════════════════════════════════════

src/pages/superadmin/Dashboard.jsx

Fila 1 — Stats globales de la plataforma:
- Total barberías registradas
- Barberías activas hoy
- Total barberos
- Total clientes registrados
- Citas completadas hoy
- Ingresos de suscripciones del mes

Llamar: GET /api/analytics/admin/platform

Fila 2 — Gráficas:
- PieChart: distribución de barberías por plan
  (BASIC / STANDARD / PREMIUM) con colores BarberApp
- LineChart: nuevas barberías registradas por mes

Fila 3 — Top barberías del mes:
- Tabla con: nombre, ciudad, plan, ingresos, rating
- Las 10 más activas

src/pages/superadmin/Barbershops.jsx
- Tabla completa de todas las barberías:
  nombre, ciudad, dueño, plan, estado, 
  fecha registro, última actividad
- Filtros: plan, ciudad, estado (activa/inactiva)
- Buscador por nombre o ciudad
- Acciones por barbería:
  * Ver detalle completo
  * Cambiar plan manualmente
  * Activar/desactivar barbería
  * Ver sus analytics

src/pages/superadmin/Users.jsx
- Tabla de todos los usuarios:
  nombre, email, rol, fecha registro, estado
- Filtros: rol (CLIENT/OWNER/BARBER/ADMIN)
- Buscador por nombre o email
- Acción: activar/desactivar usuario

src/pages/superadmin/Subscriptions.jsx
- Tabla de todas las suscripciones:
  barbería, plan, estado, fecha inicio,
  fecha vencimiento, días restantes, monto pagado
- Filtros: plan, estado
- Acciones:
  * Activar suscripción manualmente
  * Cambiar plan
  * Cancelar suscripción
- Stats en la parte superior:
  suscripciones activas, vencidas, ingresos del mes

Llamar: GET /api/subscriptions/all

src/pages/superadmin/Advertising.jsx
- Lista de TODOS los anuncios de todas las barberías
- Estado: pendiente de aprobación / activo / vencido
- Preview del video o imagen del anuncio
- Acciones:
  * Aprobar y activar anuncio
    → Modal: confirmar monto pagado
    → Llamar PUT /api/ads/:id/activate
  * Rechazar anuncio con motivo
  * Desactivar anuncio activo

═══════════════════════════════════════════════════════
TAREA 6 — Notificaciones en el panel
═══════════════════════════════════════════════════════

src/components/layout/NotificationPanel.jsx
- Dropdown al hacer click en la campana del Header
- Lista de notificaciones con:
  icono según tipo, mensaje, tiempo relativo
  (ej: "hace 5 minutos")
- Click en notificación → marcar como leída
- Botón "Marcar todas como leídas"
- Badge con cantidad de no leídas en la campana

Llamar:
- GET /api/notifications/my
- PUT /api/notifications/:id/read
- PUT /api/notifications/read-all

Polling automático cada 30 segundos para 
nuevas notificaciones con React Query refetchInterval

═══════════════════════════════════════════════════════
TAREA 7 — Perfil del usuario (Owner/Admin)
═══════════════════════════════════════════════════════

src/pages/shared/Profile.jsx
- Foto de perfil con botón para cambiar
  Llamar POST /api/upload/barber-avatar/:id
- Formulario: nombre, email, teléfono, 
  número de WhatsApp
- Preferencias de notificación:
  Toggle: recibir por WhatsApp / recibir push
  Toggle: recordatorios activados
- Cambiar contraseña:
  contraseña actual, nueva, confirmar nueva
- Botón guardar cambios

═══════════════════════════════════════════════════════
TAREA 8 — Estados vacíos y UX general
═══════════════════════════════════════════════════════

En TODAS las páginas implementar:

1. Loading skeleton mientras carga la data
   (no usar spinners genéricos, usar skeleton cards)

2. Estado vacío con ilustración y mensaje:
   - Sin citas hoy: "No hay citas programadas para hoy ✂️"
   - Sin barberos: "Agrega tu primer barbero para comenzar"
   - Sin servicios: "Crea tu catálogo de servicios"

3. Manejo de errores:
   - Si falla la API → toast de error con mensaje claro
   - Si no hay conexión → banner "Sin conexión al servidor"

4. Confirmaciones antes de acciones destructivas:
   - Cancelar cita → "¿Estás seguro? Esta acción 
     notificará al cliente"
   - Desactivar barbero → "¿Desactivar a [nombre]? 
     Sus citas futuras quedarán pendientes"
   - Eliminar oferta → "¿Eliminar esta oferta?"

5. Responsive design:
   - Sidebar colapsable en pantallas < 1024px
   - Tablas con scroll horizontal en mobile
   - Cards apiladas en una columna en mobile

IMPORTANTE:
- Leer todos los archivos ya creados antes de continuar
- Mantener consistencia visual en TODAS las páginas
- Usar react-hot-toast para todos los mensajes
- Usar React Query para TODAS las llamadas a la API
- Cada acción debe tener loading state en el botón
- Al terminar verificar npm run dev sin errores
- Verificar que el login redirige correctamente 
  según rol del usuario