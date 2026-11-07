# Música Más Vida: arquitectura móvil y ejecución local

**Estado documentado: 6 de noviembre de 2026.** Este documento describe lo que existe actualmente en el repositorio y cómo ejecutarlo en desarrollo. Mantiene los alcances definidos para los tres parciales; no presenta como terminadas las funciones previstas para etapas posteriores.

## Alcances de los parciales

- **Parcial 1 — Prototipo e integración inicial:** app Flutter con navegación, próximos eventos consumidos de la API local y detalle del evento.
- **Parcial 2 — Registro móvil e integración con la web:** generación y escaneo de QR para iniciar sesión, inscripción desde la app, validaciones de cupo y duplicados, y consulta de participantes desde administración.
- **Parcial 3 — Integración final:** calendario del dispositivo, wearable, notificaciones/recordatorios y validación final de la integración.

La app móvil actual ya contiene el catálogo, el detalle, el inicio de sesión por QR y la inscripción. La integración con el calendario y las notificaciones/recordatorios del wearable siguen siendo parte del alcance del Parcial 3; no se describen aquí como funciones móviles terminadas. La autenticación móvil implementada es por QR; no se afirma que la app ya tenga autenticación biométrica.

## 1. ¿Qué framework móvil seleccionas y cuáles son los criterios?

Se selecciona **Flutter**, utilizando **Dart**. Es coherente con el proyecto porque ya existe una app Flutter para Wear OS (`apps/smartwatch`), permite mantener un ecosistema común para los dos clientes Flutter y ofrece paquetes para las funciones móviles requeridas.

En `apps/mobile/pubspec.yaml` ya están incorporados:

- `provider` para el estado compartido.
- `http` para consumir la API REST.
- `mobile_scanner` para leer con la cámara el QR generado desde la web.

Flutter también permite desarrollar Android e iOS con una base de código común. La ejecución local documentada aquí es para **Android**; esto no implica que la versión iOS esté configurada o validada.

## 2. ¿Cómo se implementa Flutter alrededor del proyecto?

La app se encuentra en `apps/mobile` y consume la API NestJS existente en `apps/api`. Su organización actual es por funcionalidad:

- `lib/features/auth/`: pantalla, servicio y estado para el inicio de sesión por QR.
- `lib/features/events/`: modelo, servicio, estado, catálogo y detalle de eventos; también consulta y envía inscripciones.
- `lib/features/splash/`: pantalla inicial y decisión de navegación según la sesión.
- `lib/core/`: constantes compartidas, incluida la URL base de la API, y tema visual.
- `test/`: pruebas de modelos, proveedores, servicios, widgets, integración y flujo de eventos.

El flujo implementado es:

1. La persona genera el QR desde el portal web.
2. `QrLoginScreen` lo escanea; `MobileAuthService` envía el código a `POST /api/v1/auth/mobile-login`.
3. La API valida el código temporal y de un solo uso, y devuelve el token de sesión.
4. `AuthProvider` mantiene el token en memoria durante la ejecución de la app.
5. `EventService` consulta `GET /api/v1/events/upcoming` y envía las solicitudes de consulta/inscripción a la API.
6. La API usa PostgreSQL como almacenamiento persistente. El backend es la fuente de verdad; la app no usa una base local como fuente de eventos o inscripciones.

El prefijo `/api/v1` lo establece NestJS. Para el emulador Android la URL predeterminada es `http://10.0.2.2:3000/api/v1`; en un teléfono físico se reemplaza por la IP local del equipo, como se indica en **Ejecutar Flutter en un teléfono Android físico**.

## 3. ¿Qué paradigma se utiliza?

Se utiliza principalmente **programación orientada a objetos**, junto con la construcción declarativa de interfaces de Flutter. Modelos, servicios, proveedores y pantallas se representan mediante clases. Los widgets describen la interfaz para el estado actual y se reconstruyen cuando cambian los datos observados.

## 4. ¿Qué tipo de gestión de estado y almacenamiento utiliza la aplicación?

La gestión del estado compartido se realiza con **Provider**, basado en `ChangeNotifier`:

- `AuthProvider` conserva el estado de autenticación y el token en memoria.
- `EventProvider` conserva los eventos y los estados de carga/error y delega las operaciones al servicio de eventos.
- Los servicios encapsulan las llamadas HTTP para mantenerlas fuera de los widgets.

El token no se guarda de forma persistente en el dispositivo: al cerrar por completo la app, se requiere escanear un nuevo QR. Eventos e inscripciones persisten en el backend y PostgreSQL.

## 5. ¿Qué clase de widget se utiliza: Stateful o Stateless?

Se utilizan ambos según la responsabilidad:

- **`StatefulWidget`** cuando una pantalla necesita estado o ciclo de vida; por ejemplo, el splash, el escáner QR y las pantallas del catálogo/detalle que consultan o actualizan datos.
- **`StatelessWidget`** para componentes de presentación que reciben sus datos y no administran estado local.
- **Provider** se usa para el estado compartido entre pantallas, en vez de duplicarlo en cada widget.

## 6. Modelo de negocio y justificación

El proyecto funciona como un **servicio institucional gratuito para sus usuarios**: facilita consultar actividades de la escuela de música y registrarse a ellas. El portal público y el panel administrativo permiten presentar y gestionar la información.

El alcance actual no incluye pagos, venta de entradas ni suscripciones implementadas. Por ello, no se describe como una tienda o un servicio freemium.

## 7. Tipo de interfaz y navegación

La app tiene una **interfaz gráfica móvil construida con Flutter**. Su flujo principal es:

1. La pantalla de bienvenida dirige a iniciar sesión por QR cuando no hay una sesión activa.
2. Después del inicio de sesión se presenta el catálogo de próximos eventos.
3. Al seleccionar un evento se abre su detalle sobre la pantalla del catálogo.
4. La acción de volver regresa al catálogo; al cerrar sesión se vuelve al acceso.

Las rutas principales (`/splash`, `/login` y `/home`) están declaradas en `MaterialApp`; el detalle se abre sobre la pila de navegación.

## 8. ¿Cómo se aplica la pirámide de pruebas?

El proyecto móvil incluye pruebas en distintos niveles:

- **Base — unitarias:** conversión del modelo de evento, estado del proveedor y servicios de autenticación e inscripción, con respuestas HTTP simuladas.
- **Nivel medio — widgets e integración:** presentación de estados e interacción entre la interfaz, los proveedores y los servicios.
- **Punta — flujo de interfaz:** una prueba automatizada recorre el catálogo, abre el detalle, intenta una inscripción con datos simulados y vuelve al catálogo.

Las pruebas con respuestas simuladas no requieren el teléfono ni levantar la API. Para validar el QR con la cámara y el reflejo de inscripciones en administración, se necesita una prueba manual integrada con PostgreSQL, API y los dos sitios ejecutándose.

Desde PowerShell, para ejecutar las pruebas móviles:

```powershell
Set-Location C:\Proyectos\musica-masvida\apps\mobile
flutter test
flutter analyze
```

## Cómo ejecutar el proyecto en Windows

### Requisitos

- Node.js y pnpm (la versión del proyecto está indicada en el `package.json` raíz).
- Docker Desktop iniciado.
- Flutter SDK y Android SDK configurados.
- Teléfono Android con depuración USB habilitada, o conexión del teléfono y la computadora a la misma red Wi-Fi.

### 1. Preparar dependencias y base de datos

Abre PowerShell en la raíz del repositorio:

```powershell
Set-Location C:\Proyectos\musica-masvida
pnpm install
pnpm run db:up
```

El API necesita `apps/api/.env` con `DATABASE_URL` apuntando a PostgreSQL local del `docker-compose.yml` (puerto `5432`, base `musica_mas_vida`). Si todavía no existe, crea el archivo desde la plantilla y revisa sus valores:

```powershell
if (!(Test-Path .\apps\api\.env)) { Copy-Item .\.env.example .\apps\api\.env }
notepad .\apps\api\.env
```

No publiques los archivos `.env`. Genera el cliente de Prisma, aplica migraciones y carga los datos de demostración:

```powershell
pnpm prisma:generate
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db seed
```

### 2. Iniciar API, web pública y administración

Inicia cada proceso en **una terminal de PowerShell distinta**, siempre desde la raíz `C:\Proyectos\musica-masvida`:

```powershell
pnpm run dev:api
```

La API escucha en el puerto `3000` y publica sus rutas bajo `/api/v1`.

```powershell
pnpm run dev:web
```

```powershell
pnpm run dev:admin
```

Abre las direcciones que Vite y NestJS impriman en sus respectivas terminales. Vite puede asignar puertos distintos si el predeterminado ya está ocupado. Como alternativa, `pnpm run dev` inicia los tres procesos en paralelo.

El portal y el panel usan `VITE_API_URL` (por defecto `http://localhost:3000`). Si se modifica el puerto del API, actualiza esa variable en los `.env` de `apps/web` y `apps/admin`.

### 3. Ejecutar Flutter en un teléfono Android físico

1. Conecta el teléfono y la computadora a la misma red Wi-Fi. Evita redes de invitados que aíslen dispositivos.
2. En el teléfono activa las **Opciones de desarrollador** y **Depuración USB**. Conéctalo por USB y acepta el diálogo de autorización. También se puede usar un dispositivo Android configurado para depuración inalámbrica.
3. En una terminal, identifica la IPv4 de la computadora con:

   ```powershell
   ipconfig
   ```

   Usa la dirección del adaptador Wi-Fi conectado, no `127.0.0.1`.
4. Verifica que Flutter reconozca el dispositivo y ejecuta la app desde su carpeta:

```powershell
Set-Location C:\Proyectos\musica-masvida\apps\mobile
flutter pub get
flutter devices
flutter run --dart-define=API_BASE_URL=http://192.168.1.42:3000/api/v1
```

Reemplaza `192.168.1.42` por la IPv4 obtenida con `ipconfig`. La app debe apuntar a la IP de la computadora, no a `localhost`: NestJS escucha en todas las interfaces de red (`0.0.0.0`). Si Windows Firewall pregunta, permite el acceso al puerto `3000` en la red privada; también comprueba que la red no bloquee la comunicación entre dispositivos.

La opción `--dart-define` configura la URL para esa ejecución. El manifiesto de **debug** de Android permite HTTP sin cifrar para esta demostración local; no es una configuración de producción. Para un emulador Android, se puede omitir la opción, ya que el valor predeterminado `10.0.2.2` apunta al equipo anfitrión.

### 4. Probar el flujo integrado

Con API, web y administración ejecutándose, inicia sesión en el portal web, genera el QR desde el dashboard y escanéalo con la app del teléfono. Abre un evento e inscríbete; después revisa desde el panel de administración los inscritos y los cupos. La actualización del listado de administración se realiza periódicamente.

## Comandos de compilación

Desde la raíz del repositorio:

```powershell
pnpm --filter api build
pnpm --filter web build
pnpm --filter admin build
```
