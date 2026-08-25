# Estilo — App móvil (Expo)

App de clientes y barberos. Consume el backend de `../backend` (puerto 3000).

## Usar la app en un dispositivo físico (iPhone / Android con Expo Go)

El celular no puede usar `localhost`: eso apuntaría al propio teléfono. Hay que
darle la IP LAN del PC donde corre el backend.

1. **Obtener la IP del PC** — en PowerShell:

   ```powershell
   ipconfig | findstr "IPv4"
   ```

   Usa la del adaptador **Wi-Fi** (algo como `192.168.0.12`). Ignora las
   `169.254.x.x` (sin conexión) y las de VirtualBox/VMware (`192.168.56.x`).

2. **Abrir el puerto 3000 en el Firewall de Windows** — una sola vez, en
   PowerShell **como administrador**:

   ```powershell
   cd backend
   powershell -ExecutionPolicy Bypass -File scripts/setup-firewall.ps1
   ```

   Sin esto Windows bloquea al celular aunque esté en la misma red Wi-Fi.

3. **Editar `mobile/.env`** con esa IP:

   ```
   EXPO_PUBLIC_API_URL=http://192.168.0.12:3000
   ```

4. **Reiniciar Expo** (el `--clear` es necesario: Expo cachea las variables
   `EXPO_PUBLIC_*` en el bundle):

   ```bash
   npx expo start --clear
   ```

5. Escanear el QR con Expo Go. Al arrancar, la consola de Metro imprime
   `[Estilo] API URL: http://...` — verifica que sea la IP correcta.

## Cómo se resuelve la URL del backend

`src/api/axios.js` la decide en este orden:

1. `EXPO_PUBLIC_API_URL` de `mobile/.env` — si está, gana siempre.
2. El host desde el que se sirve Expo Go (`Constants.expoConfig.hostUri`): es el
   mismo PC donde corre el backend, así que la app se autoconfigura aunque el
   router cambie la IP. **Para que actúe, deja `EXPO_PUBLIC_API_URL` comentado.**
3. `http://10.0.2.2:3000` — emulador de Android.

## `--tunnel`: cuándo sí y cuándo no

`npx expo start --tunnel` publica **solo el bundler de Metro** por internet, no
el puerto 3000. El celular descarga la app pero las peticiones a la API siguen
yendo por la IP de `EXPO_PUBLIC_API_URL`, que únicamente es alcanzable desde la
misma red local.

- **Mismo Wi-Fi (lo normal):** usa `npx expo start --clear`. Es más rápido y la
  API funciona. El túnel no aporta nada aquí.
- **Redes distintas o Wi-Fi que aísla clientes:** el túnel carga la app pero la
  API fallará igual; harías falta exponer el backend con ngrok o similar y poner
  esa URL pública en `EXPO_PUBLIC_API_URL`.
- **`--tunnel` sirve** cuando el QR de LAN no conecta (redes corporativas, VPN).

## Credenciales de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Cliente | `cliente1@estilo.test` | `Cliente123!` |
| Barbero | `barber.julian@estilo.com` | `Barber123!` |

Se crean con `node scripts/seed-demo.js` desde `backend/`.
