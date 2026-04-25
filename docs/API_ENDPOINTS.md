# BarberApp API — Endpoints completos v1.0.0

Base URL: `http://localhost:3000`  
Documentación interactiva: `http://localhost:3000/api-docs`

---

## Auth
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | /api/auth/register | No | — | Registro de usuario |
| POST | /api/auth/login | No | — | Login, retorna JWT |
| GET | /api/auth/profile | Sí | Todos | Perfil del usuario autenticado |
| GET | /api/auth/google | No | — | Iniciar OAuth con Google |
| GET | /api/auth/google/callback | No | — | Callback Google, retorna JWT |
| GET | /api/auth/facebook | No | — | Iniciar OAuth con Facebook |
| GET | /api/auth/facebook/callback | No | — | Callback Facebook, retorna JWT |

---

## Barbershops
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/barbershops | No | — | Listar barberías activas (ordenadas por plan) |
| GET | /api/barbershops/:id | No | — | Detalle de una barbería |
| POST | /api/barbershops | Sí | OWNER | Crear barbería |
| PUT | /api/barbershops/:id | Sí | OWNER | Actualizar barbería |
| GET | /api/barbershops/my | Sí | OWNER | Mis barberías |

---

## Barbers
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/barbers/shop/:shopId | No | — | Barberos de una barbería |
| GET | /api/barbers/:id | No | — | Perfil de un barbero |
| POST | /api/barbers | Sí | OWNER | Agregar barbero (límite por plan) |
| PUT | /api/barbers/:id | Sí | OWNER/BARBER | Actualizar barbero |
| DELETE | /api/barbers/:id | Sí | OWNER | Desactivar barbero (soft delete) |

---

## Services
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/services/shop/:shopId | No | — | Servicios de una barbería |
| GET | /api/services/:id | No | — | Detalle de un servicio |
| POST | /api/services | Sí | OWNER | Crear servicio |
| PUT | /api/services/:id | Sí | OWNER | Actualizar servicio |
| DELETE | /api/services/:id | Sí | OWNER | Desactivar servicio (soft delete) |

---

## Schedules (Horarios)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/schedules/:barberId | No | — | Horarios de un barbero |
| POST | /api/schedules | Sí | OWNER/BARBER | Crear horario |
| PUT | /api/schedules/:id | Sí | OWNER/BARBER | Actualizar horario |
| DELETE | /api/schedules/:id | Sí | OWNER/BARBER | Eliminar horario |
| GET | /api/schedules/:barberId/available | No | — | Slots disponibles por fecha |

---

## Appointments (Citas)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/appointments/my | Sí | CLIENT | Mis citas |
| GET | /api/appointments/shop/:shopId | Sí | OWNER | Citas de la barbería |
| GET | /api/appointments/barber/:barberId | Sí | BARBER/OWNER | Citas del barbero |
| POST | /api/appointments | Sí | CLIENT | Crear cita |
| PUT | /api/appointments/:id/cancel | Sí | CLIENT/OWNER/BARBER | Cancelar cita |
| PUT | /api/appointments/:id/complete | Sí | OWNER/BARBER | Completar cita |
| PUT | /api/appointments/:id/noshow | Sí | OWNER/BARBER | Marcar no presentado |

---

## Payments (Pagos)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | /api/payments/cash/:appointmentId | Sí | OWNER/BARBER | Registrar pago en efectivo |
| GET | /api/payments/appointment/:appointmentId | Sí | CLIENT/OWNER | Ver pago de una cita |
| GET | /api/payments/shop/:shopId | Sí | OWNER | Transacciones de la barbería |
| GET | /api/payments/summary/:shopId | Sí | OWNER | Dashboard financiero |
| POST | /api/payments/refund/:appointmentId | Sí | OWNER/ADMIN | Reembolso manual |
| POST | /api/payments/stripe/create-intent | Sí | CLIENT | Crear PaymentIntent Stripe |
| POST | /api/payments/stripe/webhook | No | — | Webhook Stripe (solo Stripe) |
| POST | /api/payments/stripe/refund | Sí | OWNER/ADMIN | Reembolso vía Stripe |
| POST | /api/payments/epayco/create | Sí | CLIENT | Pago con ePayco (PSE/Nequi/Daviplata) |
| POST | /api/payments/epayco/confirm | No | — | Webhook confirmación ePayco |
| GET | /api/payments/epayco/verify/:transactionId | Sí | CLIENT | Verificar estado ePayco |

---

## Reviews (Reseñas)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/reviews/barber/:barberId | No | — | Reseñas de un barbero |
| GET | /api/reviews/shop/:shopId | No | — | Reseñas de una barbería |
| POST | /api/reviews | Sí | CLIENT | Crear reseña |
| DELETE | /api/reviews/:id | Sí | CLIENT/ADMIN | Eliminar reseña |

---

## Notifications (Notificaciones)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/notifications | Sí | Todos | Mis notificaciones |
| PUT | /api/notifications/:id/read | Sí | Todos | Marcar como leída |
| PUT | /api/notifications/read-all | Sí | Todos | Marcar todas como leídas |
| DELETE | /api/notifications/:id | Sí | Todos | Eliminar notificación |
| GET | /api/notifications/preferences | Sí | Todos | Preferencias de notificación |
| PUT | /api/notifications/preferences | Sí | Todos | Actualizar preferencias |

---

## Offers (Ofertas)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/offers/active | No | — | Ofertas activas (filtrable por barbershopId) |
| POST | /api/offers/validate | No | — | Validar código de descuento |
| GET | /api/offers/shop/:shopId | Sí | OWNER | Ofertas de mi barbería |
| POST | /api/offers | Sí | OWNER | Crear oferta (límite por plan) |
| PUT | /api/offers/:id | Sí | OWNER | Editar oferta |
| DELETE | /api/offers/:id | Sí | OWNER | Desactivar oferta |

---

## Waitlist (Lista de espera)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | /api/waitlist | Sí | CLIENT | Unirse a lista de espera |
| GET | /api/waitlist/barber/:barberId | Sí | OWNER/BARBER | Lista de espera del barbero |
| PUT | /api/waitlist/:id/confirm | Sí | CLIENT | Confirmar slot de espera |
| DELETE | /api/waitlist/:id | Sí | CLIENT | Salir de lista de espera |

---

## Calendar (Calendario)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/calendar/barber/:barberId | Sí | OWNER/BARBER | Calendario del barbero (mes/semana) |
| GET | /api/calendar/barber/:barberId/day | Sí | OWNER/BARBER | Citas del día del barbero |
| GET | /api/calendar/shop/:shopId/day | Sí | OWNER | Citas del día en toda la barbería |

---

## Barber Card (Tarjeta digital)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/barber-card/:barberId | No | — | Tarjeta digital pública del barbero |

---

## Subscriptions (Suscripciones)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | /api/subscriptions | Sí | OWNER | Crear/renovar suscripción (manual) |
| GET | /api/subscriptions/my | Sí | OWNER | Mis suscripciones |
| GET | /api/subscriptions/all | Sí | ADMIN | Todas las suscripciones |
| PUT | /api/subscriptions/:id/cancel | Sí | OWNER | Cancelar renovación automática |
| POST | /api/subscriptions/checkout | Sí | OWNER | Pagar suscripción con Stripe |
| POST | /api/subscriptions/webhook | No | — | Webhook Stripe activación suscripción |

---

## Analytics
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/analytics/shop/:shopId/overview | Sí | OWNER/ADMIN | Resumen: ingresos, citas, tendencias |
| GET | /api/analytics/shop/:shopId/clients | Sí | OWNER/ADMIN | Análisis de clientes |
| GET | /api/analytics/shop/:shopId/barbers | Sí | OWNER/ADMIN | Rendimiento por barbero |
| GET | /api/analytics/platform | Sí | ADMIN | Estadísticas de toda la plataforma |

---

## Ads (Publicidad)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/ads/active | No | — | Anuncios activos |
| GET | /api/ads/shop/:shopId | Sí | OWNER | Anuncios de mi barbería |
| POST | /api/ads | Sí | OWNER | Crear anuncio |
| PUT | /api/ads/:id | Sí | OWNER | Actualizar anuncio |
| DELETE | /api/ads/:id | Sí | OWNER | Desactivar anuncio |

---

## Upload (Subida de archivos)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | /api/upload/barbershop-logo/:shopId | Sí | OWNER | Subir logo de barbería |
| POST | /api/upload/barbershop-photo/:shopId | Sí | OWNER | Subir foto galería (límite por plan) |
| DELETE | /api/upload/barbershop-photo/:photoId | Sí | OWNER | Eliminar foto de galería |
| POST | /api/upload/barber-avatar/:barberId | Sí | OWNER/BARBER | Subir foto de perfil de barbero |
| POST | /api/upload/service-image/:serviceId | Sí | OWNER | Subir imagen de servicio |
| POST | /api/upload/ad-media/:adId | Sí | OWNER | Subir imagen/video para anuncio |

---

## Search (Búsqueda global)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/search | No | — | Búsqueda de barberías, barberos y servicios |

**Query params:** `q`, `lat`, `lng`, `radius` (km), `type`, `minRating`, `maxPrice`

---

## Earnings (Ganancias)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/earnings/barber/:barberId | Sí | OWNER/BARBER | Ganancias del barbero |
| GET | /api/earnings/shop/:shopId | Sí | OWNER | Ganancias de la barbería |
| GET | /api/earnings/barber/:barberId/today | Sí | OWNER/BARBER | Resumen rápido del día |

---

## Config (Configuración)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/config/:shopId | Sí | OWNER | Obtener configuración de la barbería |
| PUT | /api/config/:shopId | Sí | OWNER | Actualizar configuración |

---

## Loyalty (Fidelización)
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | /api/loyalty/my | Sí | CLIENT | Mis puntos de fidelización |
| GET | /api/loyalty/shop/:shopId | Sí | OWNER | Clientes fieles de la barbería |
| POST | /api/loyalty/redeem | Sí | CLIENT | Canjear puntos |

---

## Sistema
| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | / | No | — | Bienvenida a la API |
| GET | /health | No | — | Estado del servidor y servicios |
| GET | /api-docs | No | — | Swagger UI (documentación interactiva) |

---

## Variables de entorno requeridas

### Base de datos y servidor
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | ✅ | URL de conexión a PostgreSQL |
| `PORT` | ⬜ | Puerto del servidor (default: 3000) |
| `NODE_ENV` | ⬜ | Entorno: development / production |

### Autenticación JWT
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `JWT_SECRET` | ✅ | Clave secreta para firmar JWT |
| `JWT_EXPIRES_IN` | ⬜ | Expiración del token (default: 7d) |

### OAuth Google
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `GOOGLE_CLIENT_ID` | ⬜ | ID de cliente OAuth de Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ⬜ | Secreto de cliente Google |
| `GOOGLE_CALLBACK_URL` | ⬜ | URL de callback (ej: /api/auth/google/callback) |

### OAuth Facebook
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `FACEBOOK_APP_ID` | ⬜ | App ID de Facebook Developers |
| `FACEBOOK_APP_SECRET` | ⬜ | App Secret de Facebook |
| `FACEBOOK_CALLBACK_URL` | ⬜ | URL de callback Facebook |

### Cloudinary (subida de imágenes)
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `CLOUDINARY_CLOUD_NAME` | ⬜ | Nombre del cloud en Cloudinary |
| `CLOUDINARY_API_KEY` | ⬜ | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | ⬜ | API Secret de Cloudinary |

### Stripe (pagos internacionales)
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `STRIPE_SECRET_KEY` | ⬜ | Clave secreta de Stripe (sk_live_... o sk_test_...) |
| `STRIPE_PUBLISHABLE_KEY` | ⬜ | Clave pública de Stripe (pk_live_... o pk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | ⬜ | Secreto del webhook de Stripe |

### ePayco (pagos Colombia)
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `EPAYCO_P_KEY` | ⬜ | P-Key de ePayco (para validar webhooks) |
| `EPAYCO_PUBLIC_KEY` | ⬜ | Clave pública ePayco |
| `EPAYCO_API_KEY` | ⬜ | API Key ePayco |
| `EPAYCO_PRIVATE_KEY` | ⬜ | Clave privada ePayco |
| `EPAYCO_TEST` | ⬜ | `true` en desarrollo, `false` en producción |
| `EPAYCO_REDIRECT_URL` | ⬜ | URL de redirección post-pago |
| `EPAYCO_RESPONSE_URL` | ⬜ | URL de respuesta webhook |

### Twilio (SMS/WhatsApp)
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `TWILIO_ACCOUNT_SID` | ⬜ | Account SID de Twilio |
| `TWILIO_AUTH_TOKEN` | ⬜ | Auth Token de Twilio |
| `TWILIO_PHONE_NUMBER` | ⬜ | Número de teléfono Twilio |

### Firebase (notificaciones push)
| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `FIREBASE_PROJECT_ID` | ⬜ | ID del proyecto en Firebase |
| `FIREBASE_PRIVATE_KEY` | ⬜ | Clave privada de service account |
| `FIREBASE_CLIENT_EMAIL` | ⬜ | Email del service account |
