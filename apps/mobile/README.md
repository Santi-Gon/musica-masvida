# Música Más Vida Mobile (Flutter)

La app muestra los próximos eventos del backend local. Para iniciar sesión, genera un QR temporal en el portal web y escanéalo con la cámara del emulador o del celular. El QR vence en cinco minutos y se puede usar una sola vez. Después, abre un evento y pulsa **Inscribirme al evento**; la API valida la cuenta, los duplicados y los lugares disponibles, y administración muestra la lista de alumnos inscritos.

## Preparar el entorno local

1. Inicia Docker Desktop. Desde la raíz del proyecto, levanta PostgreSQL:

   ```powershell
   pnpm run db:up
   ```

2. Si no existe `apps/api/.env`, créalo desde la plantilla y comprueba que `DATABASE_URL` apunte a la base local definida en `docker-compose.yml`:

   ```powershell
   if (!(Test-Path apps/api/.env)) { Copy-Item .env.example apps/api/.env }
   ```

   No subas ese archivo al repositorio.

3. Genera el cliente Prisma, aplica migraciones y carga los datos de demostración:

   ```powershell
   pnpm prisma:generate
   pnpm --filter api exec prisma migrate deploy
   pnpm --filter api exec prisma db seed
   ```

4. En otra terminal, desde la raíz, inicia API, sitio y administración:

   ```powershell
   pnpm run dev
   ```

   Usa las direcciones que Vite y NestJS impriman en la terminal. La API local usa el puerto `3000`.

5. Inicia sesión en el portal web con `user@example.com` / `user123`, abre **Dashboard del Alumno** y genera el QR para Flutter.

6. Inicia el emulador Android y desde `apps/mobile` ejecuta:

   ```powershell
   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
   ```

   `10.0.2.2` apunta al equipo anfitrión desde el emulador Android. En un teléfono físico, usa la IP local del equipo (`ipconfig`) y verifica que ambos estén en la misma red:

   ```powershell
   flutter run --dart-define=API_BASE_URL=http://<IP-DEL-EQUIPO>:3000/api/v1
   ```

   El permiso HTTP sin cifrar solo está habilitado en el manifiesto **debug** de Android para esta demostración local.

7. Escanea el QR desde el teléfono. Abre un evento, inscríbete y verifica en administración (`admin@musicamasvida.com` / `admin123`) la columna de cupos y el botón de inscritos. La lista se actualiza automáticamente cada cinco segundos.

## Evidencias para el segundo parcial

- Captura del QR generado en el portal y del escaneo exitoso en Flutter.
- Video corto mostrando: inicio de sesión, catálogo, detalle, inscripción y actualización de inscritos en administración.
- Capturas del total/cupo y de la lista de alumnos inscritos.
- Ejecuta las pruebas para respaldar QR expirado o reutilizado, inscripción duplicada, cupo completo, errores HTTP y el flujo de navegación.

## Validación

Desde `apps/mobile`:

```powershell
flutter test
flutter analyze
```

Desde la raíz:

```powershell
pnpm --filter api build
pnpm --filter web build
pnpm --filter admin build
```
