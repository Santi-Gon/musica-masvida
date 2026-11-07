# Guía paso a paso: probar el segundo parcial en local

Esta guía sirve para levantar Música Más Vida en tu computadora y probar el flujo completo: QR del portal web → inicio de sesión en Flutter → inscripción a un evento → verificación en administración.

> Alcance: segundo parcial, con autenticación por QR/JWT. No incluye biometría, calendario ni wearable del tercer parcial.

## Antes de comenzar

- Abre Docker Desktop y espera a que indique que está en ejecución.
- Ten instalados Node.js, pnpm, Flutter y Android Studio (con un emulador configurado), o conecta un teléfono Android.
- Para escanear el QR con la cámara del teléfono físico, ten el teléfono y la computadora conectados a la misma red Wi-Fi.
- Abre PowerShell en la carpeta raíz del proyecto:

  ```powershell
  cd C:\Proyectos\musica-masvida
  ```

## 1. Iniciar PostgreSQL local

En PowerShell:

```powershell
pnpm run db:up
docker compose ps
Test-NetConnection 127.0.0.1 -Port 5432
```

Confirma que el contenedor `musica-masvida-db` esté activo y que la última comprobación indique `TcpTestSucceeded: True`.

## 2. Revisar la configuración de la base

El backend lee su configuración desde `apps/api/.env`. Si ese archivo no existe, créalo usando la plantilla de la raíz:

```powershell
if (!(Test-Path apps/api/.env)) { Copy-Item .env.example apps/api/.env }
```

Abre `apps/api/.env` y comprueba que `DATABASE_URL` apunte a PostgreSQL local, puerto `5432`, base `musica_mas_vida`, usuario `admin`. No reemplaces un archivo existente sin revisarlo y no compartas ni subas los secretos del `.env`.

## 3. Preparar la base de datos

Desde la raíz del proyecto, ejecuta:

```powershell
pnpm prisma:generate
pnpm --filter api exec prisma migrate deploy
```

La migración crea las tablas que necesita este flujo. Para cargar datos de demostración, ejecuta el seed **una sola vez**:

```powershell
pnpm --filter api exec prisma db seed
```

El seed puede crear otro evento si lo vuelves a ejecutar. Si ya tienes datos de prueba, omite ese paso.

## 4. Iniciar API, sitio web y administración

En la misma raíz, inicia los servicios:

```powershell
$env:VITE_API_URL = 'http://localhost:3000'
pnpm run dev
```

Deja esta terminal abierta. Espera a que NestJS y ambos servidores de Vite indiquen que están listos. Anota las direcciones que imprime cada servidor; si los puertos cambian, usa los que muestre tu terminal.

Comprueba que la API responde abriendo esta dirección en el navegador:

```text
http://localhost:3000/api/v1/events/upcoming
```

Debe aparecer una respuesta JSON con eventos próximos. Si recibes una lista vacía, confirma que ejecutaste el seed y que los eventos tienen fecha futura.

## 5. Iniciar sesión en el portal y generar el QR

1. Abre en el navegador la dirección local del **sitio web** que imprimió Vite y añade `/login` (por ejemplo, `http://localhost:5173/login`).
2. Inicia sesión con el usuario de demostración:

   ```text
   Correo: user@example.com
   Contraseña: user123
   ```

3. En **Dashboard del Alumno**, pulsa **Generar QR para Flutter**.
4. Mantén el QR visible en la pantalla de la computadora. Dura cinco minutos y solo se puede usar una vez; si caduca, genera otro.

## 6. Ejecutar Flutter en un emulador Android

En otra ventana de PowerShell:

```powershell
cd C:\Proyectos\musica-masvida\apps\mobile
flutter devices
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
```

`10.0.2.2` es la dirección que usa el emulador Android para llegar a la computadora. Acepta el permiso de cámara y escanea el QR que está en la pantalla del equipo. Si el emulador no puede enfocar la pantalla, prueba con un teléfono físico.

## 7. Ejecutar Flutter en un teléfono Android

En la computadora, busca la dirección IPv4 local con:

```powershell
ipconfig
```

Identifica la dirección IPv4 del adaptador Wi-Fi que está conectado a la misma red que el teléfono. Por ejemplo, si es `192.168.1.25`, desde `apps/mobile` ejecuta:

```powershell
flutter devices
flutter run --dart-define=API_BASE_URL=http://192.168.1.25:3000/api/v1
```

Reemplaza `192.168.1.25` por la dirección real de tu computadora. No escribas los corchetes de ejemplo en el comando. Acepta el permiso de cámara y escanea el QR generado en la computadora.

Si la app no se conecta:

- Confirma que el teléfono y la computadora estén en la misma Wi-Fi.
- Confirma que el backend siga activo en la primera terminal.
- En el navegador del teléfono, prueba `http://IP-DE-TU-PC:3000/api/v1/events/upcoming`.
- Si no abre, revisa el firewall de Windows y permite el acceso de Node.js/NestJS a la red privada local.

## 8. Probar inscripción y sincronización

En Flutter:

1. Espera a que aparezca la lista de eventos.
2. Abre un evento y revisa sus datos.
3. Pulsa **Inscribirme al evento**.
4. Confirma que el botón cambie a **Ya estás inscrito**.

En una pestaña aparte, abre la dirección local de **administración** que imprimió Vite y añade `/login`:

```text
Correo: admin@musicamasvida.com
Contraseña: admin123
```

1. Entra a **Eventos**.
2. Revisa la columna **Inscritos** para confirmar el total y el cupo.
3. Pulsa el botón de personas para abrir la lista de alumnos inscritos.
4. La lista se actualiza automáticamente cada cinco segundos.

## 9. Comprobaciones automáticas opcionales

Desde `apps/mobile`:

```powershell
flutter test
flutter analyze
```

Desde la raíz:

```powershell
pnpm --filter api test -- --runInBand
pnpm --filter api build
pnpm --filter web build
pnpm --filter admin build
```

Las pruebas cubren respuestas del QR, errores, duplicados, cupos y navegación. Para probar manualmente un QR vencido o ya usado, genera uno y espera cinco minutos antes de escanearlo, o intenta escanear el mismo código por segunda vez.

## 10. Guardar evidencia para la entrega

Guarda tus capturas o videos en `evidencias/`. Procura mostrar:

- El QR generado en el portal.
- La cámara de Flutter escaneándolo y el acceso exitoso.
- La lista de eventos y el detalle del evento.
- La inscripción completada.
- El alumno reflejado en administración, junto con el total de inscritos y el cupo.

Un video corto que muestre ese recorrido completo es la evidencia principal.

## Al terminar

- Para cerrar los servidores, vuelve a la terminal de `pnpm run dev` y pulsa `Ctrl+C`.
- Cierra Flutter con `q` en la terminal donde corre `flutter run`.
- Para detener PostgreSQL sin borrar tus datos, desde la raíz ejecuta:

  ```powershell
  pnpm run db:down
  ```

- No uses `pnpm run db:reset` para esta prueba: elimina también los datos locales.
