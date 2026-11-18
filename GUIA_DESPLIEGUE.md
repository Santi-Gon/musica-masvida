# Guía de despliegue — Música Más Vida (todo gratis, sin tarjeta)

Ruta recomendada para este proyecto, sin pagar nada y sin tarjeta:

| Componente | Carpeta | Plataforma | Costo | Tarjeta |
|---|---|---|---|---|
| Base de datos PostgreSQL | — | **Neon** (free tier permanente) | $0 | No |
| Backend NestJS + Prisma | `apps/api` | **Render** (Web Service free) | $0 | No |
| Frontend web + PWA | `apps/web` | **Vercel** Hobby | $0 | No |
| Panel de administración | `apps/admin` | **Vercel** Hobby | $0 | No |

> **Por qué no Railway:** su “gratis” es un crédito de 5 USD por 30 días y luego 1 USD/mes, insuficiente para un servicio siempre activo. Neon y Render sí tienen capa gratuita permanente.
> **La contra de Render:** el servicio gratis **duerme a los 15 minutos sin tráfico** y tarda ~1 minuto en despertar. Para un proyecto escolar/demo es aceptable, y en el paso 3.6 te explico cómo mantenerlo despierto.

```
Navegador
  ├─ https://musica-masvida.vercel.app        → web (PWA)
  └─ https://musica-masvida-admin.vercel.app  → admin
              │  fetch HTTPS (VITE_API_URL)
              ▼
        https://musica-masvida-api.onrender.com/api/v1
              │  DATABASE_URL (SSL)
              ▼
        Neon PostgreSQL (us-east-2)
```

Antes de empezar estaban previstos Railway y una base local; el código no cambia, solo las variables de entorno.

---

## 0. Requisitos y preparación

- Cuenta de GitHub.
- Cuenta en [neon.com](https://neon.com), [render.com](https://render.com) y [vercel.com](https://vercel.com) (puedes entrar con GitHub).
- `pnpm` local (el repo usa `pnpm@11.21.0`).
- No necesitas tarjeta para ninguna de las tres.

### 0.1 Subir los cambios a GitHub

Las plataformas despliegan **desde Git**, no desde tu disco. Ahora mismo estás en la rama `correcciones` con cambios sin commitear:

```powershell
cd C:\Proyectos\musica-masvida
git status
git add -A
git commit -m "Preparar despliegue gratuito (Neon + Render + Vercel)"
git push origin correcciones
```

Recomendado: fusionar a `main`, que es la rama que usarás en producción y la que referencian `render.yaml` y Vercel:

```powershell
git checkout main
git pull
git merge correcciones
git push origin main
```

> Ya dejé listos `apps/admin/vercel.json` (rewrites SPA), el `render.yaml` (blueprint de Render) y `coverage/` en `.gitignore`.

### 0.2 Probar el build en local

```powershell
pnpm install --frozen-lockfile
pnpm --filter api exec prisma generate
pnpm --filter api build
pnpm --filter web build
pnpm --filter admin build
```

Si esto pasa, el despliegue debería pasar. El backend compila a `apps/api/dist/src/main.js`, que es lo que arranca `start:prod`.

---

## 1. Base de datos en Neon (5 minutos)

1. Entra a [neon.com](https://neon.com) → **Sign up with GitHub**.
2. **Create project**:
   - Nombre: `musica-masvida`
   - Región: la más cercana (por ejemplo `AWS us-east-2`).
   - Versión de Postgres: la que ofrezca por defecto (16 o superior).
3. En el panel del proyecto, abre **Connect** / **Connection string** y copia la **Direct connection** (no la *pooled*). Debe verse así:

   ```
   postgresql://neondb_owner:TU_PASSWORD@ep-xxxxx-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. Guárdala: será tu `DATABASE_URL` en Render.
5. No crees tablas a mano. Las migraciones están en `apps/api/prisma/migrations` y se aplican al arrancar el backend (`prisma migrate deploy`).

Notas:

- Usa la conexión **directa** (no el pooler) porque Prisma ejecuta migraciones y usa advisory locks; el pooler puede fallar con `prisma migrate deploy`.
- Neon gratis: ~0.5–1 GB por proyecto y suspensión por inactividad (despierta solo en la primera consulta, ~1 s).
- El plan gratuito de Postgres de Render **se borra a los 30 días**, por eso usamos Neon.

---

## 2. API en Render

### 2.1 Crear el Web Service

Opción A — con el blueprint (más rápido):

1. En Render: **New → Blueprint**.
2. Conecta GitHub y elige `musica-masvida`.
3. Render lee `render.yaml` y propone el servicio `musica-masvida-api` en plan **Free**.
4. Pulsa **Apply** y completa las variables marcadas con `sync: false` (paso 2.3).

Opción B — manual:

1. **New → Web Service** → conecta el repo.
2. Configura:
   - **Name**: `musica-masvida-api`
   - **Language**: `Node`
   - **Branch**: `main` (o la rama que uses)
   - **Root Directory**: vacío (raíz del monorepo)
   - **Region**: la misma de Neon si puedes (ej. Ohio)
   - **Build Command**:

     ```bash
     pnpm install --frozen-lockfile && pnpm --filter api exec prisma generate && pnpm --filter api build
     ```

   - **Start Command**:

     ```bash
     pnpm --filter api start:prod
     ```

   - **Health Check Path**: `/api/v1`
   - **Instance Type**: `Free`

El script `start:prod` de `apps/api/package.json` hace `prisma migrate deploy && node dist/src/main`: aplica migraciones y arranca NestJS. No necesitas correrlas a mano.

### 2.2 Variables de entorno

En **Environment** del servicio:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | cadena **directa** de Neon (paso 1) |
| `JWT_SECRET` | cadena aleatoria larga (comando abajo) |
| `JWT_EXPIRES_IN` | `24h` |
| `VAPID_PUBLIC_KEY` | tu clave pública VAPID |
| `VAPID_PRIVATE_KEY` | tu clave privada VAPID |
| `VAPID_SUBJECT` | `mailto:tu-correo@dominio.com` |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |

Genera el secreto JWT:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Genera el par VAPID si no lo tienes:

```powershell
npx web-push generate-vapid-keys
```

- **No** definas `PORT`: Render lo inyecta y `main.ts` ya lee `process.env.PORT`.
- `VITE_VAPID_PUBLIC_KEY` del frontend debe ser la **misma** clave pública que `VAPID_PUBLIC_KEY` de la API.

### 2.3 Desplegar y verificar

1. Pulsa **Deploy** (o haz push a `main`). El primer build tarda varios minutos (instala el monorepo entero).
2. En **Logs** debes ver las migraciones y `Backend corriendo en puerto .../api/v1`.
3. La URL pública queda como `https://musica-masvida-api.onrender.com`.
4. Prueba:

   ```powershell
   Invoke-RestMethod https://musica-masvida-api.onrender.com/api/v1
   Invoke-RestMethod https://musica-masvida-api.onrender.com/api/v1/events
   ```

   Si es la primera petición tras un rato inactivo, puede tardar ~1 minuto (cold start).

### 2.4 Crear el primer administrador

```powershell
# admin@musicamasvida.com / password123 (solo si no existe ningún admin)
Invoke-RestMethod -Method Post -Uri https://musica-masvida-api.onrender.com/api/v1/auth/setup

# Opcional: alumno de prueba (alumno@musicamasvida.com / alumno123)
Invoke-RestMethod -Method Post -Uri https://musica-masvida-api.onrender.com/api/v1/auth/setup-user
```

- `/auth/setup` responde `409` si ya hay administradores.
- Cambia la contraseña temporal. No hay endpoint para ello; genera el hash y actualiza `admin_users.password` (con Prisma Studio apuntando a la URL de Neon):

  ```powershell
  node -e "require('bcrypt').hash('MiNuevaClaveSegura',10).then(h=>console.log(h))"
  $env:DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
  pnpm --filter api exec prisma studio
  ```

### 2.5 Datos de demostración (opcional)

Con Neon no necesitas proxies ni túneles: el seed corre desde tu máquina contra la URL directa.

```powershell
$env:DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
pnpm --filter api exec prisma db seed
Remove-Item Env:DATABASE_URL
```

> Ojo: el seed **no es idempotente con los eventos** (crea uno nuevo cada vez). El resto usa `upsert`.

### 2.6 Evitar los cold starts (truco para la demo)

Render te da **750 horas de instancia al mes** y un mes tiene ~730, así que un solo servicio puede estar despierto prácticamente todo el mes si recibe tráfico periódico. Con un monitor gratuito:

1. Crea una cuenta en [cron-job.org](https://cron-job.org) o [UptimeRobot](https://uptimerobot.com) (ambos gratis).
2. Programa un `GET` a `https://musica-masvida-api.onrender.com/api/v1` **cada 10–14 minutos**.
3. Eso evita que Render lo duerma y hace que la demo cargue al instante.

Alternativa: aceptar el cold start y abrir la web ~1 minuto antes de la presentación.

> Si Render te pidiera tarjeta para verificar la cuenta (no debería en el plan free), alternativas sin tarjeta: **SnapDeploy** (4 contenedores, 100 h/mes, duerme a los 15 min) o **Northflank Sandbox** (2 servicios siempre activos, pero exige tarjeta solo para verificar).

---

## 3. Frontend web en Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importa `musica-masvida`.
2. Configura:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist`
   - **Install Command**: automático (Vercel detecta el workspace pnpm).
3. **Environment Variables** (se incrustan en el build, no son de runtime):

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://musica-masvida-api.onrender.com` (**sin** `/api/v1` ni `/` final) |
   | `VITE_VAPID_PUBLIC_KEY` | tu clave pública VAPID |

4. **Deploy**. URL resultante: `https://musica-masvida.vercel.app`.
5. `apps/web/vercel.json` ya reescribe todas las rutas a `index.html` (recargar `/dashboard` funciona).

> Si el build falla por no encontrar el lockfile o dependencias: **Install Command** `cd ../.. && pnpm install --frozen-lockfile` y **Build Command** `cd ../.. && pnpm --filter web build`.

---

## 4. Panel de administración en Vercel

Repite el paso 3 como **otro proyecto** de Vercel:

- **Root Directory**: `apps/admin`
- **Framework**: `Vite`
- **Build**: `pnpm run build`
- **Output**: `dist`
- **Variable**: `VITE_API_URL` = `https://musica-masvida-api.onrender.com`

`apps/admin/vercel.json` habilita las rutas SPA (`/dashboard`, `/events`, etc.).

---

## 5. Endurecer CORS (recomendado)

`apps/api/src/main.ts` hoy acepta cualquier origen (`origin: true`). Para limitarlo:

```ts
// apps/api/src/main.ts
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.enableCors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
});
```

Y en Render:

```
CORS_ORIGINS=https://musica-masvida.vercel.app,https://musica-masvida-admin.vercel.app
```

Si usas dominios propios, agrégalos separados por coma.

---

## 6. Verificación de punta a punta

1. **API**: `GET https://musica-masvida-api.onrender.com/api/v1/events` → `200`.
2. **Web**: los eventos cargan desde Render (DevTools → Network).
3. **Admin**: inicia sesión con el admin del paso 2.4 y crea un evento.
4. **Web**: recarga y confirma que aparece el evento nuevo.
5. **PWA**: desde el móvil, “Agregar a pantalla de inicio”. El push requiere HTTPS (Vercel lo da).
6. **QR / smartwatch**: entra como alumno en la web y genera el PIN.

Checklist:

- [ ] Render: `DATABASE_URL`, `JWT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NODE_VERSION=22`
- [ ] Vercel web: `VITE_API_URL`, `VITE_VAPID_PUBLIC_KEY`
- [ ] Vercel admin: `VITE_API_URL`
- [ ] Ambas `VITE_API_URL` sin `/api/v1` y sin `/` final
- [ ] Tras cambiar una variable `VITE_*` → **Redeploy** en Vercel

---

## 7. Actualizaciones futuras

- **Backend**: `git push` a `main` → Render reconstruye y `start:prod` aplica migraciones nuevas.
- **Frontends**: `git push` → Vercel reconstruye.
- **Nueva migración Prisma**:

  ```powershell
  pnpm --filter api exec prisma migrate dev --name descripcion_cambio
  git add apps/api/prisma/migrations
  git commit -m "migración: descripcion_cambio"
  git push
  ```

  `prisma migrate deploy` corre sola al arrancar la API.

---

## 8. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Primera petición tarda ~1 min | Servicio dormido (plan free) | Normal. Usa el keep-alive del paso 2.6 |
| “Application failed to respond” | Puerto/arranque incorrecto | Revisa Logs; `main.ts` ya escucha en `0.0.0.0` y `process.env.PORT` |
| `P1001: Can't reach database server` | URL mal copiada o Neon suspendido | Usa la cadena **directa** con `?sslmode=require` |
| `prisma migrate deploy` falla con advisory lock | Estás usando la URL *pooled* | Cambia a la conexión directa de Neon |
| Build de Render falla por memoria/tiempo | Monorepo completo en plan free | Reintenta; si persiste, usa `pnpm install --filter api...` en el build |
| `ERR_PNPM_OUTDATED_LOCKFILE` | Lockfile desactualizado | `pnpm install` y commit del `pnpm-lock.yaml` |
| Web sin datos | `VITE_API_URL` mal o cambiada sin redeploy | Corrige la variable y haz **Redeploy** |
| 404 al recargar el admin | Falta el rewrite SPA | Verifica que `apps/admin/vercel.json` está en el deploy |
| CORS bloqueado | Origen no incluido (paso 5) | Agrega el dominio exacto a `CORS_ORIGINS` |
| Push no llega | Claves VAPID distintas o subject sin `mailto:` | Mismo par VAPID en API y web |
| `admin_users` vacío | No ejecutaste el bootstrap | `POST /api/v1/auth/setup` |

---

## 9. Otras alternativas (por si Render no te convence)

| Opción | Backend | Base de datos | Tarjeta | Nota |
|---|---|---|---|---|
| **Neon + Render** (esta guía) | 750 h/mes, duerme a los 15 min | Neon free permanente | No | La más simple y sostenible |
| SnapDeploy + Neon | 100 h/mes, duerme | Neon | No | Menos conocido |
| Northflank Sandbox + Neon | 2 servicios siempre activos | 1 BD incluida | Sí (verificación) | Sin cold starts |
| Google Cloud Run + Neon | Free tier amplio | Neon | Sí | Siempre activo con scale-to-zero |
| Railway | $1/mes de crédito | Postgres incluido | No | No alcanza para un servicio activo |
| Oracle Cloud Always Free | VM ARM 2 OCPU / 12 GB | Postgres en la VM | Sí (verificación) | Siempre gratis, pero administras el servidor |

### Nota sobre la app móvil (Flutter)

`apps/mobile` toma la URL de `API_BASE_URL` (`lib/core/constants/app_constants.dart`):

```powershell
flutter run --dart-define=API_BASE_URL=https://musica-masvida-api.onrender.com/api/v1
flutter build apk --dart-define=API_BASE_URL=https://musica-masvida-api.onrender.com/api/v1
```

En el emulador Android, `10.0.2.2` reemplaza a `localhost` solo en desarrollo local.
