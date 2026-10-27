# Changelog - Música Más Vida Mobile

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.0] - 2026-10-05 — Parcial 1: Fundación del Proyecto Móvil

### ✨ Agregado

#### Configuración Inicial
- Creación del proyecto Flutter `musica_masvida_mobile` dentro del monorepo en la ruta `apps/mobile`.
- Configuración del proyecto con soporte para plataformas **Android** e **iOS**.
- Adopción de arquitectura **Feature-first** (`lib/features/`, `lib/core/`).

#### Dependencias
- **`http: ^1.2.2`** — Cliente HTTP para peticiones de red a la API REST de NestJS.
- **`provider: ^6.1.2`** — Manejador de estado reactivo con `ChangeNotifier`.
- Comentario placeholder para **`mobile_scanner`** preparando la práctica de laboratorio de escaneo QR.

#### Core
- `lib/core/constants/app_constants.dart` — Constantes globales: URL base de la API (`http://10.0.2.2:3000/api/v1`), nombre de la app y duración del splash.
- `lib/core/theme/app_theme.dart` — Tema oscuro premium con color primario dorado (`#DF9E14`) usando Material 3.

#### Feature: Splash
- `lib/features/splash/screens/splash_screen.dart` — Pantalla de inicio animada (fade + escala) con duración de 3 segundos y navegación automática al Home.

#### Feature: Events
- `lib/features/events/models/upcoming_event.dart` — Modelo `UpcomingEvent` con campos `id`, `title`, `date`, `time`, `location`. Convierte fechas ISO 8601 a formato DD/MM/YYYY en `fromJson`.
- `lib/features/events/services/event_service.dart` — Servicio HTTP que realiza `GET /events/upcoming` con timeout de 10 segundos.
- `lib/features/events/providers/event_provider.dart` — `EventProvider` (ChangeNotifier) con estados `initial / loading / loaded / error`, método `refresh()` y parseo de errores de red.
- `lib/features/events/screens/home_screen.dart` — Pantalla Home que consume `EventProvider`: muestra `CircularProgressIndicator` dorado durante la carga, manejo de errores con botón de reintento, lista de tarjetas de eventos con pull-to-refresh.
- `lib/features/events/screens/event_detail_screen.dart` — Pantalla de detalle del evento con header hero degradado, tarjeta de información (fecha, hora, ubicación) y botón inactivo para el futuro escáner QR.

#### Punto de entrada
- `lib/main.dart` — `MultiProvider` con `EventProvider`, tema oscuro configurado, rutas nombradas `/splash` y `/home`.

#### Tests
- `test/event_model_test.dart` — 7 pruebas unitarias para `UpcomingEvent.fromJson`: JSON completo, formato de fecha, campos nulos, fecha inválida, `toString()`, `toJson()`.

---

### 📋 Pendiente (Próximas entregas)

#### Práctica de Laboratorio — Escáner QR
- [ ] Agregar dependencia `mobile_scanner: ^6.0.0` en `pubspec.yaml`.
- [ ] Crear `lib/features/qr_scanner/` con la pantalla de escaneo.
- [ ] Activar el botón "Escanear QR de Asistencia" en `EventDetailScreen`.
- [ ] Agregar permisos de cámara en `AndroidManifest.xml` e `Info.plist`.

#### Parcial 2 (por definir)
- [ ] Autenticación de usuarios (login/registro).
- [ ] Perfil del estudiante.
- [ ] Gestión de inscripciones a eventos.
