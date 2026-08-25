# Estilo

Plataforma de reservas para barberías: backend Node/Express + Prisma, panel web
React y app móvil Expo.

| Carpeta | Qué es | Puerto |
|---|---|---|
| `backend/` | API REST (Express + Prisma + PostgreSQL) | 3000 |
| `web/` | Panel de administración (React + Vite) — ADMIN / OWNER / BARBER | 5173 |
| `mobile/` | App de clientes y barberos (Expo) — ver [mobile/README.md](mobile/README.md) | — |
| `docs/` | [Endpoints de la API](docs/API_ENDPOINTS.md) | — |

## Arranque

```bash
# 1. Backend
cd backend
cp .env.example .env      # completar DATABASE_URL y JWT_SECRET
npm install
npx prisma migrate deploy
node scripts/seed-demo.js # datos de demo + usuarios de prueba
npm run dev               # http://localhost:3000  (health: /health)

# 2. Panel web
cd web && npm install && npm run dev   # http://localhost:5173
```

## Abrir el puerto 3000 en el Firewall (para probar en el celular)

El Firewall de Windows bloquea las conexiones entrantes al backend, así que el
celular no lo alcanza aunque esté en la misma red Wi-Fi. Abrir PowerShell
**COMO ADMINISTRADOR** y ejecutar:

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File scripts/setup-firewall.ps1
```

El script es idempotente (no duplica la regla) y al final imprime la IP Wi-Fi
del PC, que es la que va en `mobile/.env`.

## Usuarios de prueba

Creados por `backend/scripts/seed-demo.js`:

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `admin@estilo.com` | `Admin123!` |
| Owner | `owner.imperial@estilo.com` | `Owner123!` |
| Barbero | `barber.julian@estilo.com` | `Barber123!` |
| Cliente | `cliente1@estilo.test` | `Cliente123!` |

## Scripts útiles (`backend/scripts/`)

| Script | Para qué |
|---|---|
| `seed-demo.js` | Datos de demo completos + desbloqueo de todas las cuentas |
| `test-email.js <correo>` | Probar el envío SMTP de recuperación de contraseña |
| `setup-firewall.ps1` | Abrir el puerto 3000 en el Firewall (admin) |
| `smoke-test.js` | Recorrido rápido de la API con los 4 roles |
| `migrate-emails-estilo.js` | Migración de dominios `@barberapp.*` → `@estilo.*` |
