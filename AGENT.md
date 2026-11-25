# AGENT.md — Directrices de Desarrollo para OpenCode
## Proyecto: Música Más Vida (Monorepo Full-Stack)

---

### 1. Visión General y Arquitectura
Este repositorio es un monorepo administrado con `pnpm` estructurado de la siguiente forma:

* **`apps/api`**: Backend REST API desarrollado en **NestJS 10 + Prisma ORM + PostgreSQL**.
  * Puerto local: `3000`, prefijo global: `/api/v1`.
  * Base de datos en producción: **Neon PostgreSQL**.
  * Despliegue en producción: **Render**.
* **`apps/mobile`**: Aplicación móvil para alumnos en **Flutter 3 / Dart**.
  * Login mediante escaneo de código QR (`mobile_scanner`).
  * Catálogo de eventos, detalle e inscripción protegida con JWT.
* **`apps/web`**: Portal público y dashboard de alumnos en **React 18 + Vite + TypeScript**.
  * Despliegue en producción: **Vercel**.
* **`apps/admin`**: Panel administrativo de la escuela de música en **React 18 + Vite + TypeScript**.
  * Gestión de eventos, maestros, usuarios y auditorías.
* **`apps/smartwatch`**: Aplicación para Wear OS en Flutter (autenticación por PIN).
* **`packages/types`**: Tipos TypeScript compartidos.

---

### 2. Protocolo de Trabajo Obligatorio (3 Fases)

Cada tarea o requerimiento debe seguir rigurosamente este flujo entre los agentes:

```
[Usuario / Requerimiento]
          │
          ▼
   1. @architect (Orquestador - Claude Sonnet 5.5 / GPT-6)
      - Lee y analiza el código actual afectado.
      - Escribe el plan técnico detallado (esquemas Prisma, contratos DTO, métodos y UI).
          │
          ▼
   2. @coder (Programador - Kimi k2.7 / DeepSeek Pro)
      - Implementa las modificaciones en archivos específicos.
      - Ejecuta migraciones o comandos de dependencias (`pnpm add`, `flutter pub get`).
          │
          ▼
   3. @reviewer (Auditor - DeepSeek v4.1 Flash / Claude Haiku)
      - Ejecuta linters: `dart analyze`, `npm run lint`.
      - Ejecuta pruebas: `flutter test`, `cd apps/api && npx jest`.
      - Valida seguridad y que los códigos HTTP / respuestas sean correctos.
      - Emite el visto bueno final o lista de correcciones.
```

---

### 3. Tareas Pendientes por Implementar (Parcial 3 & Mejoras)

#### Tarea 1: Web Pública Alumnos (`apps/web`) — Botones de Login y Logout
* **Objetivo**: Permitir que el alumno inicie y cierre sesión de forma clara en cualquier momento.
* **Archivos a modificar**:
  * `apps/web/src/components/layout/Navbar.tsx`:
    * Cuando el usuario tiene sesión activa (`isLoggedIn`), mostrar el botón **"Dashboard"** Y un botón accesible de **"Cerrar Sesión"** (que borre `localStorage.removeItem('accessToken')` y redirija a `/`).
    * Aplicar el mismo cambio en el menú hamburguesa móvil (`mobile-menu`).
  * `apps/web/src/pages/Dashboard/Dashboard.tsx`:
    * Agregar un botón de **"Cerrar Sesión"** en la esquina superior del Dashboard para que el alumno no dependa únicamente del Navbar.
    * Asegurar que el botón **"Iniciar Sesión"** lleve a `/login` si no hay sesión.

#### Tarea 2: Backend y BD (`apps/api`) — Módulo de Tickets / Reportes de Errores
* **Objetivo**: Crear la infraestructura de datos y API para registrar incidentes técnicos.
* **Archivos a modificar**:
  * `apps/api/prisma/schema.prisma`:
    * Agregar modelo `SupportTicket` con campos: `id`, `title`, `description`, `category` (`APP_ERROR`, `LOGIN_ISSUE`, `EVENT_REGISTRATION`, `OTRO`), `priority` (`BAJA`, `MEDIA`, `ALTA`, `CRITICA`), `status` (`PENDIENTE`, `EN_PROCESO`, `EN_REVISION`, `TERMINADO`), `deviceInfo` (opcional), `userId` (FK a `User`), `createdAt`, `updatedAt`.
    * Enums: `TicketPriority` y `TicketStatus`.
  * `apps/api/src/modules/tickets/`:
    * `dto/create-ticket.dto.ts` y `dto/update-ticket.dto.ts`.
    * `tickets.service.ts`: Métodos `create()` para alumnos autenticados, `findAllAdmin()` para el panel, `updateAdmin()` para actualizar estado y prioridad.
    * `tickets.controller.ts`:
      * `POST /api/v1/tickets`: Autenticado (`USER`).
      * `GET /api/v1/tickets/admin`: Autenticado (`ADMIN`).
      * `PATCH /api/v1/tickets/admin/:id`: Autenticado (`ADMIN`).
  * `apps/api/src/app.module.ts`: Registrar `TicketsModule`.

#### Tarea 3: Panel Administrativo (`apps/admin`) — Vista de Gestión de Tickets
* **Objetivo**: Que el administrador pueda revisar, filtrar y gestionar los reportes de alumnos.
* **Archivos a modificar**:
  * `apps/admin/src/services/api.ts`: Agregar `ticketsApi.getAll()`, `ticketsApi.updateStatus()`, `ticketsApi.updatePriority()`.
  * `apps/admin/src/pages/Tickets/Tickets.tsx` (crear):
    * Tabla con: Alumno, Asunto/Descripción, Categoría, Prioridad (badges de color), Estado (select para cambiar entre Pendiente, En proceso, En revisión, Terminado), Fecha.
    * Filtro rápido por estado y búsqueda por texto.
  * `apps/admin/src/components/layout/Sidebar.tsx`: Agregar item de navegación hacia `/tickets` con icono 🎫 o 🛠️.
  * `apps/admin/src/App.tsx`: Registrar la ruta `/tickets`.

#### Tarea 4: App Móvil (`apps/mobile`) — Chatbot de Soporte y Reporte de Errores
* **Objetivo**: Guiar al alumno mediante un diálogo interactivo tipo chatbot para reportar fallos y generar el ticket.
* **Archivos a modificar**:
  * `apps/mobile/lib/features/events/screens/home_screen.dart`:
    * Agregar un Floating Action Button (FAB) o acción en el AppBar con icono de soporte/asistente (`Icons.support_agent_rounded` o `Icons.chat_bubble_outline_rounded`).
  * `apps/mobile/lib/features/support/`:
    * `models/support_ticket.dart`: DTO del ticket.
    * `services/support_service.dart`: Llamada HTTP `POST /api/v1/tickets` con JWT.
    * `screens/support_chatbot_sheet.dart` (o dialog):
      * Flujo guiado:
        1. Saludo del asistente virtual de Música Más Vida.
        2. Chips de selección rápida de categorías ("Fallo con escáner QR", "Error al inscribirme", "App lenta / se cierra", "Otro").
        3. Campo para detallar brevemente el incidente.
        4. Botón de envío que conecta con la API.
        5. Confirmación con el ID del ticket generado ("Ticket registrado con éxito").

#### Tarea 5: App Móvil (`apps/mobile`) — Calendario Nativo (`add_2_calendar`)
* **Objetivo**: Permitir al alumno añadir el evento a Google Calendar / Apple Calendar tras inscribirse.
* **Archivos a modificar**:
  * `apps/mobile/pubspec.yaml`: Agregar `add_2_calendar: ^3.0.1`.
  * `apps/mobile/lib/features/events/screens/event_detail_screen.dart`:
    * Cuando el alumno ya esté inscrito (`_isRegistered == true`), mostrar además un botón destacado:
      * **"📅 Agregar al Calendario"**.
    * Al presionarlo, crear una instancia de `Event` de `add_2_calendar` con `title`, `description`, `location`, y fecha/hora calculadas, e invocar `Add2Calendar.addEvent2Cal(...)`.

---

### 4. Reglas de Calidad y Convenciones

1. **Seguridad**:
   * Nunca dejar contraseñas ni secretos en texto plano.
   * Utilizar siempre `JwtAuthGuard` en endpoints protegidos.
2. **Manejo de Errores en Flutter**:
   * Toda llamada a la API debe estar dentro de un bloque `try/catch`.
   * Los errores de red deben traducirse a mensajes amigables para el usuario.
3. **Estilos de UI**:
   * En Flutter: Usar la paleta de colores del tema (`AppTheme.primaryGold = #DF9E14`, `AppTheme.backgroundDark = #121212`).
   * En React: Mantener los tokens CSS y componentes de `AdminLayout` / `Navbar`.
4. **Verificación Previa**:
   * Antes de dar por terminada cualquier tarea, el agente `reviewer` debe ejecutar:
     * `cd apps/mobile && flutter test`
     * `cd apps/api && npm run build` (o `npx jest`)
