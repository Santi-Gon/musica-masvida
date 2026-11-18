# Práctica 11 — Pruebas de Whitebox

**Proyecto:** Música Más Vida (`musica-masvida`)
**Estudiante:** Santiago González Aguirre
**Asignatura:** Desarrollo para Dispositivos Inteligentes
**Fecha de ejecución:** 18 de noviembre de 2026
**Rama:** `correcciones` · **Commit:** `4ea963d`
**Repositorio:** https://github.com/Santi-Gon/musica-masvida

---

## 1. Resumen ejecutivo

Se aplicaron pruebas de caja blanca en cuatro frentes: aplicación móvil Flutter, API NestJS, base de datos PostgreSQL y conectividad/rendimiento contra el despliegue real. **Todas las cifras de este documento provienen de ejecuciones reales** cuyos archivos de evidencia se listan en el Anexo A; no se inventó ninguna métrica ni se usaron capturas como única prueba.

| Frente | Herramienta | Ejecuciones | Resultado |
|---|---|---|---|
| Móvil (unitarias, integración, E2E, límites) | `flutter test` | 48 pruebas | **48/48 aprobadas** |
| Móvil (cobertura de líneas) | `flutter test --coverage` | 9 archivos instrumentados | **86.19 % (312/362)** |
| Móvil (análisis estático) | `flutter analyze` | 1 ejecución | **0 issues** |
| API (unitarias de servicios) | Jest | 57 pruebas / 5 suites | **57/57 aprobadas** |
| API (cobertura) | Jest `--coverage` | 32 archivos | **32.02 % sentencias**, `events.service` **100 %** |
| Base de datos | Node + `pg` contra Neon | 12 verificaciones | **12 OK / 0 fallos** |
| API desplegada | Script HTTP propio | 40+ solicitudes | 200/201/204/400/401/404/409 OK · **403 no se aplica (defecto)** |
| Red y carga | `Test-Connection`, HTTP timing | 20 ICMP + 60 solicitudes de carga | **0 % pérdida**, 100 % éxito hasta 10 usuarios |

**Hallazgo principal:** la API desplegada permite **escalamiento vertical de privilegios**. Un token de rol `USER` puede crear, editar y borrar eventos y listar usuarios administradores, y el endpoint público `POST /auth/setup-user` entrega un JWT válido **sin credenciales**. Se documentan 7 defectos (2 críticos) en la sección 7.

---

## 2. Entorno de ejecución

| Elemento | Valor real medido |
|---|---|
| Sistema operativo | Windows 11 Home Single Language 10.0.26200 (build 26200) |
| Flutter | 3.47.6 stable · Dart 3.13.5 · DevTools 2.60.0 |
| Node.js | v22.23.2 |
| pnpm | 11.21.0 |
| Navegador / dispositivo móvil | Ningún emulador Android ni teléfono físico disponible (`flutter devices` solo lista Windows, Chrome y Edge; `flutter emulators` vacío) |
| API | https://musica-masvida-api.onrender.com/api/v1 (Render, plan free) |
| Web | https://musica-masvida.vercel.app |
| Admin | https://musica-masvida-yhbs.vercel.app/login |
| Base de datos | Neon PostgreSQL 18.7, host `ep-blue-pond-be0gqn6l.c-9.us-east-2.aws.neon.tech`, base `neondb` |
| Versión lógica desplegada | rama `correcciones`, commit `4ea963d` |

### Justificación de pruebas no ejecutadas

| Prueba solicitada | Estado | Justificación y alternativa aplicada |
|---|---|---|
| Ejecución en emulador/dispositivo Android | No ejecutada | El equipo no tiene emulador ni teléfono; `flutter emulators` devuelve lista vacía y `flutter devices` solo Windows/Chrome/Edge. Se ejecutó la suite automatizada completa sobre el runner de Flutter en Windows, que ejercita los mismos widgets, providers y servicios. Se documenta como limitación. |
| Wireshark / captura de paquetes | No ejecutada | No se instaló capturador ni se cuenta con permisos de NIC en modo promiscuo. La transferencia se midió en la capa de aplicación (bytes reales del cuerpo / tiempo), que es la métrica solicitada (Mbps). |
| ICMP a Neon | Bloqueado | Neon no responde a ICMP (0/20). Se usó la latencia real de ida y vuelta de las consultas SQL (85–100 ms) como indicador de red. |
| Código 422 | No aplica | NestJS con `class-validator` responde **400** ante fallos de validación; el proyecto no define una capa que emita 422. Se verificó el mismo caso (fecha inválida) y se documenta el 400. |
| Código 500 inducido | No ejecutado | Provocar un 500 en producción requeriría corromper datos o tumbar el servicio. El camino de error se cubrió con pruebas unitarias que inyectan `PrismaClientKnownRequestError` y errores desconocidos (`events.service.whitebox.spec.ts`). |
| Migraciones / `prisma migrate` contra Neon | No ejecutado | El host es el *pooler* (`-pooler`), que puede fallar en *advisory locks*; además el esquema ya está aplicado en producción. Las pruebas de BD se hicieron con SQL directo y limpieza total. |

---

## 3. Fase 1 — Pruebas de caja blanca en la aplicación móvil

### 3.1 Métodos críticos seleccionados

Se eligieron tres métodos que concentran la lógica de negocio y la comunicación con el servicio:

1. `EventService.getUpcomingEvents()` — comunicación HTTP, parseo de JSON y códigos de estado.
2. `EventProvider.fetchUpcomingEvents()` — máquina de estados (`initial → loading → loaded/error`) y clasificación de excepciones.
3. `EventService.isRegistered()` / `registerForEvent()` — contrato de inscripción (200/201/409) y validación de tipos.
4. Como cuarto método de referencia del backend se analiza `EventsService.register()` (API), por su CFG con 8 caminos.

### 3.2 Grafo de flujo de control (CFG)

#### Método A — `EventService.getUpcomingEvents()` (Dart)

```
        [1] inicio
          |
          v
     <2> useMock?
      /        \
   sí          no
   |            |
   v            v
 [3] lista   [4] GET /events/upcoming (timeout 10 s)
 local          |
   |            v
   |        <5> ¿excepción de red? --sí--> [6] on Exception: rethrow --> [fin]
   |            |
   |            no
   |            v
   |        <7> statusCode == 200?
   |          /        \
   |        sí          no
   |        |            |
   |        v            v
   |   [8] jsonDecode   [9] throw Exception("Código: N")
   |       + map
   |        |            |
   \--------+------------+
            v
          [10] fin
```

- Nodos: 10 · Aristas: 11 · **Complejidad ciclomática V(G) = 11 − 10 + 2 = 3** (más el camino implícito de excepción → 4 caminos independientes).
- Caminos independientes:
  1. `1-2-3-10` (modo mock, sin red).
  2. `1-2-4-5-7-8-10` (200 con JSON válido).
  3. `1-2-4-5-7-9-10` (código ≠ 200).
  4. `1-2-4-5-6-10` (timeout/socket).

#### Método B — `EventProvider.fetchUpcomingEvents()` (Dart)

```
[1] inicio
  |
  v
<2> status == loading? --sí--> [3] return
  |
  no
  v
[4] status = loading; error = ''; notifyListeners()
  |
  v
[5] try: events = await service.getUpcomingEvents()
  |         |
  |         +-- éxito --> [6] status = loaded
  |         |
  |         +-- excepción --> [7] status = error
  |                             |
  |                             v
  |                       <8> _parseError(e)
  |                        /    |      \
  |             Socket/refused  Timeout  otro
  |                   |           |       |
  |                   v           v       v
  |                [9] msg     [10] msg  [11] msg
  \___________________|___________|_______/
                      v
             [12] finally: notifyListeners() -> [13] fin
```

- **V(G) = 5** (2 decisiones de estado + 3 ramas de clasificación de error).
- Caminos: (a) ya estaba cargando; (b) éxito; (c) error de conexión; (d) timeout; (e) error genérico.

#### Método C — `EventsService.register()` (NestJS)

```
[1] inicio
 |  v
<2> role != 'USER' --sí--> [3] throw 403
 | no
 v
[4] $transaction(Serializable)
 |  v
<5> !event || !event.isActive --sí--> [6] throw 404
 | no
 v
<7> !user?.isActive --sí--> [8] throw 403
 | no
 v
<9> existingRegistration --sí--> [10] throw 409
 | no
 v
<11> count >= capacity --sí--> [12] throw 409
 | no
 v
[13] create registration --> [14] return
 |  (catch)
 v
<15> P2002? --sí--> [16] throw 409
 | no
 v
<17> P2034? --sí--> [18] throw 409
 | no
 v
[19] throw original
```

- **V(G) = 8** (7 decisiones + 1).
- Los 8 caminos están cubiertos por `events.service.whitebox.spec.ts` (30 pruebas), lo que explica su **100 % de sentencias**.

### 3.3 Cobertura obtenida (real)

Salida de `flutter test --coverage` (lcov, ejecución limpia del 2026-11-18):

| Archivo | Líneas | Cubiertas | % |
|---|---:|---:|---:|
| `lib/features/events/models/upcoming_event.dart` | 26 | 26 | **100.0** |
| `lib/features/auth/services/mobile_auth_service.dart` | 15 | 15 | **100.0** |
| `lib/features/events/services/event_service.dart` | 45 | 44 | **97.8** |
| `lib/features/events/providers/event_provider.dart` | 32 | 31 | **96.9** |
| `lib/core/theme/app_theme.dart` | 13 | 12 | 92.3 |
| `lib/features/events/screens/event_detail_screen.dart` | 109 | 95 | 87.2 |
| `lib/features/events/screens/home_screen.dart` | 103 | 86 | 83.5 |
| `lib/features/auth/providers/auth_provider.dart` | 18 | 3 | 16.7 |
| `lib/core/constants/app_constants.dart` | 1 | 0 | 0.0 |
| **Total** | **362** | **312** | **86.19** |

**Cobertura de ramas:** el runner de Flutter 3.47.6 acepta `--branch-coverage`, pero el `lcov.info` generado no emitió registros `BRDA` (`BRF=0`) para estos archivos; por tanto **no se reporta un porcentaje de ramas inventado**. En su lugar, la cobertura de condiciones se verificó con la matriz de casos de la sección 3.5, donde cada decisión se ejecutó en sus dos sentidos (verdadero y falso).

**Justificación de archivos con baja cobertura:** `auth_provider.dart` (16.7 %) corresponde al inicio de sesión por QR/correo, que no forma parte del módulo crítico de eventos y no se ejercita en los tests actuales; se deja documentado como deuda de pruebas en lugar de inflar la cifra con pruebas artificiales. `app_constants.dart` solo contiene constantes, sin lógica.

### 3.4 Pruebas de valores límite

| ID | Entrada | Resultado esperado | Resultado real |
|---|---|---|---|
| WB-L01 | JSON `{}` en `UpcomingEvent.fromJson` | Valores por defecto, sin excepción | `id=''`, `title='Sin título'`, `capacity=50` ✅ |
| WB-L02 | `date='32/13/2026'` | Se conserva, no lanza | `'32/13/2026'` ✅ |
| WB-L03 | `capacity=30.9` | Truncar a entero | `30` ✅ |
| WB-L04 | `title=123` (tipo erróneo) | `TypeError` | `TypeError` ✅ (sin validación) |
| WB-L05 | `date=20261220` (numérico) | `TypeError` | `TypeError` ✅ |
| WB-L06 | `registered='si'` (string) | `TypeError` en el cast | **`TypeError` → DEF-06** ❌ |
| WB-L07 | HTTP 201 con cuerpo vacío en `registerForEvent` | Completar sin error | `completes` ✅ |
| WB-L08 | HTTP 409 con `message` string | `Exception` con mensaje del backend | Mensaje propagado ✅ |
| WB-L09 | HTTP 200 con `<html>` | `FormatException` | `FormatException` ✅ (no controlada) |
| WB-L10 | Lista vacía `[]` en provider | `loaded`, `hasData=false` | Correcto ✅ |

### 3.5 Cobertura de condiciones por caso

| Decisión | Verdadero | Falso |
|---|---|---|
| `useMock` | `useMock evita cualquier llamada HTTP` | `200 con JSON válido` |
| `statusCode == 200` | `200 con JSON válido` | `código 500 lanza Exception` |
| `status == loading` | `una segunda llamada durante loading se ignora` | resto de pruebas del provider |
| `response.statusCode != 201` | `409 ...` | `201 sin cuerpo` |
| tipo de `message` (`String` / `List` / otro) | 3 pruebas de `message` | `error no JSON` |
| `socket / timeout / otro` | 3 pruebas de `_parseError` | — |
| `capacity >= límite` (API) | `register rechaza cuando se alcanzó la capacidad` | camino exitoso |
| rol `USER` / `ADMIN` | `register rechaza a un administrador` | camino exitoso |

### 3.6 Pruebas de excepción e interrupción (móvil)

Se simuló caída de red con `MockClient` y con un servicio falso que lanza excepciones:

- `SocketException` / `Failed host lookup` → el provider muestra “No se pudo conectar al servidor…” y **no** deja datos falsos.
- `TimeoutException` → “La solicitud tardó demasiado…”.
- Error genérico → “Ocurrió un error inesperado” + detalle.
- Respuesta 500 → el servicio lanza `Exception('… Código: 500')`.
- Respuesta 502 con HTML → `FormatException` (defecto documentado).
- Tras el fallo, una nueva llamada recupera el estado `loaded`; no hay éxito fantasma.

Estas pruebas están en `apps/mobile/test/whitebox_boundary_test.dart` y se suman a las 21 pruebas previas de `event_flow_e2e_test.dart`, `event_integration_test.dart`, `event_model_test.dart`, `event_provider_unit_test.dart`, `event_registration_service_test.dart` y `mobile_auth_service_test.dart`.

---

## 4. Fase 2 — Pruebas de caja blanca en web / API

### 4.1 Endpoints ejercitados

Se probaron **más de tres endpoints** contra el despliegue real:

| Endpoint | Método | Autenticación | Propósito |
|---|---|---|---|
| `/auth/login` | POST | Pública | Login de administrador |
| `/auth/user/login` | POST | Pública | Login de alumno |
| `/auth/setup-user` | POST | **Ninguna** | Bootstrap de alumno (DEF-01) |
| `/events` | GET | Pública | Listado de eventos activos |
| `/events` | POST | JWT | Crear evento |
| `/events/{id}` | GET | Pública | Detalle |
| `/events/{id}` | PUT / DELETE | JWT | Actualizar / eliminar |
| `/events/{id}/register` | POST | JWT | Inscripción |
| `/events/admin/all` | GET | JWT | Listado administrativo |
| `/users/admin/all` | GET | JWT | Listado de usuarios |
| `/auth/me` | GET | JWT | Validación del token |

### 4.2 Matriz de códigos HTTP observados

| Código | Caso | Esperado | Observado | Veredicto |
|---|---|---|---|---|
| **200** | `GET /events` | 200 | 200 (2 bytes, `[]`) | ✅ |
| **200** | `POST /auth/login` con credenciales válidas | 200 | 200 (406 bytes, campos `accessToken`, `user`) | ✅ |
| **201** | `POST /events` con token admin | 201 | 201 | ✅ |
| **201** | `POST /events/{id}/register` primera vez | 201 | 201 | ✅ |
| **204** | `DELETE /events/{id}` | 204 | 204 | ✅ |
| **400** | `POST /events` sin `description` | 400 | 400 | ✅ |
| **400** | Fecha `2026-13-45T99:99:99Z` | 400 | 400 | ✅ (no se usa 422) |
| **401** | `POST /events` sin token | 401 | 401 | ✅ |
| **403** | `POST /events` con token `USER` | 403 | **201** | ❌ DEF-02 |
| **403** | `GET /users/admin/all` con token `USER` | 403 | **200** | ❌ DEF-02 |
| **404** | `GET /events/{uuid inexistente}` | 404 | 404 | ✅ |
| **409** | Segunda inscripción al mismo evento | 409 | 409 | ✅ |
| **422** | Validación semántica | 422 | No implementado | ⚠️ Justificado |
| **500** | Falla interna | 500 | No inducido | ⚠️ Cubierto por unitarias |

### 4.3 Consistencia del JSON y datos sensibles

- `GET /events` devuelve un **array JSON**; `POST /events` devuelve el objeto creado con `id`, `title`, `description`, `date`, `time`, `location`, `capacity`, `isActive`.
- Los errores de validación respetan el formato de NestJS: `{ "message": [...], "error": "Bad Request", "statusCode": 400 }`.
- `POST /auth/login` devuelve solo `accessToken` y `user`; **no** incluye `password`.
- `GET /users/admin/all` (200) **no** contiene `password` ni `smartwatchPin` (verificado con expresiones regulares sobre el cuerpo crudo).
- El token JWT contiene `sub`, `email`, `role`, `iat`, `exp`; no contiene datos sensibles.
- **Sin embargo**, `POST /auth/setup` devuelve la contraseña del admin en texto plano en su respuesta de bootstrap (DEF-01), y `POST /auth/setup-user` entrega un token sin credenciales (DEF-01).

### 4.4 Cobertura de pruebas automatizadas de la API

`pnpm --filter api test -- --coverage` (5 suites, 57 pruebas, todas aprobadas):

| Archivo | Sentencias | Ramas | Funciones | Líneas |
|---|---:|---:|---:|---:|
| `events.service.ts` | **100** | 95 | 100 | 100 |
| `auth.service.ts` | **98.86** | 92.5 | 100 | 98.83 |
| `notifications.service.ts` | 20 | 26.08 | 0 | 15.78 |
| Controladores, DTOs, `users`, `teachers`, `pricing`, `instruments` | 0 | — | 0 | 0 |
| **Total** | **32.02** | **35.59** | **26** | **32.38** |

Los controladores y DTOs tienen 0 % porque **no se probaron con Jest**, sino con solicitudes HTTP reales contra Render (sección 4.2); se prefirió evidencia de integración real antes que mocks que solo inflen el porcentaje. Además, `jwt-auth.guard.ts` tiene 0 % de cobertura unitaria: su comportamiento se validó observando 401 sin token y 200 con token.

Archivos nuevos de pruebas:
- `apps/api/src/modules/events/events.service.whitebox.spec.ts` (30 pruebas)
- `apps/api/src/modules/auth/auth.service.whitebox.spec.ts` (20 pruebas)
- `apps/mobile/test/whitebox_boundary_test.dart` (27 pruebas)

---

## 5. Fase 3 — Pruebas de caja blanca en base de datos

Script: `evidencias/practica11/scripts/db_whitebox.mjs` (Node + `pg`) contra Neon PostgreSQL 18.7. Resultado: **12 OK / 0 fallos**. Todos los registros creados fueron eliminados al final (eventos, usuarios e inscripciones).

### 5.1 CRUD y restricciones

| ID | Prueba | Resultado | Tiempo |
|---|---|---|---|
| DB-01 | `INSERT` válido en `events` | 1 fila, id correcto | 93.07 ms |
| DB-01b | `INSERT` válido en `event_registrations` | 1 fila | 86.24 ms |
| DB-02a | `title = NULL` | Error **23502** (NOT NULL) | — |
| DB-02b | `date = 'no-es-fecha'` | Error **22007** (fecha inválida) | — |
| DB-02c | Inscripción duplicada `(eventId, userId)` | Error **23505** (UNIQUE) | — |
| DB-02d | `userId` inexistente | Error **23503** (FK) | — |
| DB-03a | `SELECT` por id existente | 1 fila | 672.17 ms (primer acceso) |
| DB-03b | `SELECT` por id inexistente | 0 filas | 86.06 ms |
| DB-03c | `SELECT` tras `DELETE` | 0 filas | — |
| DB-04 | `UPDATE` de título y ubicación | Persistido | 86.58 ms |
| DB-05 | `BEGIN` + `INSERT` + `ROLLBACK` | No persiste (0 filas) | — |
| DB-05b/c | `DELETE` de inscripciones y evento | 2 + 1 filas | 85.15 ms |
| DB-06 | Dos inserciones simultáneas del mismo par | 1 OK + 1 error **23505** | — |
| DB-06b | Dos `UPDATE` simultáneos | Ambos commit (last write wins) | — |

### 5.2 Índices y restricciones encontrados

```
event_registrations_eventId_userId_key  UNIQUE (eventId, userId)
event_registrations_userId_idx          INDEX (userId)
event_registrations_pkey                PRIMARY KEY (id)
events_pkey                             PRIMARY KEY (id)
users_email_key                         UNIQUE (email)
```

Restricciones relevantes: `events.capacity NOT NULL DEFAULT 50`, claves foráneas con `ON DELETE CASCADE`, y `users.email` único. **No existe índice** sobre `events(isActive, date)` ni sobre `events(date)`, que son los filtros de `GET /events` y `/events/upcoming` (ver DEF-07).

### 5.3 Tiempos de consulta (5 ejecuciones cada una)

| Consulta | Mín. | Prom. | Máx. |
|---|---:|---:|---:|
| Q1 · eventos activos ordenados por fecha | 85.38 ms | 93.84 ms | 104.22 ms |
| Q2 · evento por id | 85.28 ms | 90.14 ms | 97.43 ms |
| Q3 · conteo de inscripciones por evento | 87.15 ms | 101.13 ms | 121.71 ms |
| Q4 · admin con subconsulta de conteo | 85.14 ms | 96.54 ms | 110.56 ms |

El tiempo incluye el viaje de red hasta Neon (≈85 ms de RTT); el tiempo **de ejecución real** medido por `EXPLAIN ANALYZE` es de **0.039 a 0.087 ms**.

### 5.4 `EXPLAIN ANALYZE`

- **Q1:** `Seq Scan on events` + `Sort` — 1 fila, 1 buffer, ejecución **0.039 ms**. Correcto por el tamaño actual, pero sin índice para el filtro `isActive` + orden por `date`.
- **Q2:** `Index Scan using events_pkey` — 1 fila, 2 buffers, **0.040 ms**. Uso correcto de la PK.
- **Q3:** `Bitmap Index Scan on event_registrations_eventId_userId_key` + `Bitmap Heap Scan` — **0.051 ms**. El índice único compuesto se reutiliza para contar por `eventId`.
- **Q4:** `Seq Scan` + `Sort` + `SubPlan` con `Bitmap Index Scan` — **0.087 ms**. La subconsulta por evento usa el índice; el escaneo secuencial es aceptable con 1 fila.

### 5.5 Concurrencia y transacciones

- **Inscripción duplicada concurrente:** dos conexiones intentan insertar el mismo `(eventId, userId)`; una gana y la otra recibe `23505`. La restricción UNIQUE es la última línea de defensa, incluso si la validación de aplicación fallara.
- **Actualización concurrente:** dos `UPDATE` sobre el mismo evento se confirman; gana el último en escribir (`CLIENTE-A` en la ejecución). **No hay bloqueo optimista ni versión**, por lo que se pierde una actualización silenciosamente. Se reporta como riesgo (no como fallo de integridad).
- **Rollback:** la transacción revertida no deja rastro; consistente.

---

## 6. Fase 4 — Conectividad y rendimiento

### 6.1 Ping (20 paquetes)

| Destino | Enviados | Recibidos | Pérdida | Mín. | Prom. | Máx. | Desv. |
|---|---:|---:|---:|---:|---:|---:|---:|
| `musica-masvida-api.onrender.com` | 20 | 20 | **0 %** | 67 ms | **73.9 ms** | 114 ms | 10.9 ms |
| `ep-blue-pond-be0gqn6l...neon.tech` | 20 | 0 | 100 % (ICMP bloqueado) | — | — | — | — |

Neon no responde ICMP; su latencia se midió con las consultas SQL (≈85–100 ms).

### 6.2 Diez solicitudes HTTP consecutivas a `GET /events`

| # | Código | Tiempo | Bytes |
|---:|---:|---:|---:|
| 1 | 200 | 154.03 ms | 2 |
| 2 | 200 | 146.77 ms | 2 |
| 3 | 200 | 166.36 ms | 2 |
| 4 | 200 | 159.85 ms | 2 |
| 5 | 200 | 158.86 ms | 2 |
| 6 | 200 | 176.65 ms | 2 |
| 7 | 200 | 165.68 ms | 2 |
| 8 | 200 | 147.86 ms | 2 |
| 9 | 200 | 153.21 ms | 2 |
| 10 | 200 | 152.08 ms | 2 |

- Promedio: **158.13 ms** · P95: **176.65 ms** · Mín. 146.77 ms · Máx. 176.65 ms · Desv. ≈ 8.85 ms.
- El cuerpo de **2 bytes** corresponde a `[]`: en ese instante la base no tenía eventos activos. Es una medición real; la transferencia con carga se midió después (6.3).

### 6.3 Descarga y subida (Mbps)

Fórmula aplicada: `Mbps = (bytes × 8) / (ms / 1000) / 1 000 000`.

| Operación | Cuerpo | Tiempo | Mbps |
|---|---:|---:|---:|
| Descarga API 1 | 13 240 B | 186.25 ms | 0.569 |
| Descarga API 2 | 13 240 B | 142.73 ms | **0.742** |
| Descarga API 3 | 13 240 B | 146.50 ms | 0.723 |
| Descarga bundle web (JS) | 311 045 B | 142.48 ms | **17.464** |
| Subida 1 (4 244 B) | 4 244 B | 150.66 ms | 0.234 |
| Subida 2 (4 244 B) | 4 244 B | 161.62 ms | 0.218 |
| Subida 3 (4 244 B) | 4 244 B | 151.17 ms | 0.233 |

Ejemplo de cálculo: `311045 × 8 / 0.14248 / 1e6 = 17.46 Mbps`.
La subida es baja porque el cuerpo es pequeño frente al RTT: el costo dominante es la latencia, no el ancho de banda.

### 6.4 Prueba de carga (20 solicitudes por escenario)

| Usuarios concurrentes | Solicitudes | Éxitos | Fallos | Prom. | P95 | RPS | Mbps |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 20 | 20 | 0 | 153.97 ms | 177.57 ms | 6.49 | 0.688 |
| 5 | 20 | 20 | 0 | 193.07 ms | 411.80 ms | 23.28 | 2.466 |
| 10 | 20 | 20 | 0 | 258.65 ms | 490.51 ms | 33.77 | 3.577 |

**Interpretación:** el servicio escala de forma aceptable hasta 10 usuarios concurrentes, sin errores. El P95 se degrada de 177 ms a 490 ms y la desviación crece de 27.5 a 134.2 ms, lo que evidencia contención en el plan gratuito de Render (una instancia, sin réplicas). No se observó *cold start* porque la API se calentó antes (primer request 525 ms).

### 6.5 Pérdida de conexión, reintento y duplicados

- **Interrupción:** se abortó una solicitud a 1 ms (`AbortSignal.timeout(1)`) → `TimeoutError`. La siguiente solicitud real devolvió **200 en 135.68 ms**, confirmando recuperación sin reiniciar el cliente.
- **Reintento móvil:** `EventProvider` clasifica el fallo y permite `refresh()`; no marca `loaded` si hubo excepción.
- **Duplicados:** la inscripción repetida devuelve **409** y la base rechaza el duplicado con **23505** incluso en concurrencia.
- **Eventos duplicados:** dos `POST /events` idénticos crean **dos eventos distintos** (201/201, ids diferentes) y cinco POST simultáneos crean **cinco eventos**. No hay clave de idempotencia (DEF-04).

---

## 7. Defectos encontrados

### DEF-01 · Crítico · Bootstrap sin autenticación entrega JWT y contraseña en texto plano

| Campo | Detalle |
|---|---|
| Componente | `AuthController` / `AuthService.setupInitialUser`, `setupInitialAdmin` |
| Pasos | `POST /api/v1/auth/setup-user` sin cuerpo, sin token → respuesta 201 con `accessToken`; usar ese token en `GET /api/v1/auth/me` |
| Esperado | 403/404/409 y ningún token sin credenciales |
| Actual | **201 + JWT válido** de `alumno@musicamasvida.com`, `role: USER`; `GET /auth/me` → 200 |
| Severidad | **Crítica** (toma de cuenta / acceso no autenticado) |
| Evidencia | `evidencias/practica11/authz_results.json` (`tokenSinCredenciales: true`, `me: 200`, claims con `role: "USER"`) |
| Corrección | Deshabilitar ambos endpoints en producción (variable `ALLOW_BOOTSTRAP=false`), exigir un secreto de arranque de un solo uso y devolver 409 si ya existen datos. Nunca devolver la contraseña ni un token en el bootstrap. Añadir prueba de regresión que espere 403 sin secreto. |

Además, `POST /auth/setup` devuelve `password: "password123"` en texto plano y crea el administrador con credenciales predecibles (DEF-05).

### DEF-02 · Crítico · Ausencia de autorización por rol: un alumno puede administrar eventos y ver usuarios

| Campo | Detalle |
|---|---|
| Componente | `EventsController` (`POST`, `PUT`, `DELETE`, `GET /admin/all`) y `UsersController` (`GET /admin/all`) |
| Pasos | Obtener token `USER` (incluso con DEF-01) y ejecutar `POST /events`, `DELETE /events/{id}`, `GET /users/admin/all` |
| Esperado | **403** en todas |
| Actual | `POST /events` → **201**; `DELETE /events/{id}` → **204** (evento eliminado); `GET /users/admin/all` → **200**; `GET /events/admin/all` → **200** |
| Severidad | **Crítica** (escalamiento vertical de privilegios) |
| Evidencia | `http_results.json` (`codigos["403 esperado: POST /events con token USER"].observado = 201`) y `authz_results.json` (`deleteConUser: 204`, `adminAllConUser: 200`, `eventoDespues: 404`) |
| Corrección | Crear `RolesGuard` + decorador `@Roles('ADMIN')` y aplicarlo en todas las rutas administrativas; validar el rol **en el servidor**, no en el cliente. Añadir pruebas de integración 403 para cada ruta. |

### DEF-03 · Alto · CORS abierto con credenciales

| Campo | Detalle |
|---|---|
| Componente | `apps/api/src/main.ts` |
| Código | `app.enableCors({ origin: true, credentials: true })` |
| Riesgo | Cualquier sitio puede llamar a la API con credenciales; si el token se guarda en el navegador, un sitio malicioso puede operar en nombre del usuario |
| Severidad | **Alta** |
| Evidencia | `main.ts` línea 10 y respuesta con `access-control-allow-origin` reflejando el origen |
| Corrección | Lista blanca explícita (`https://musica-masvida.vercel.app`, `https://musica-masvida-yhbs.vercel.app`, `http://localhost:5173` en desarrollo) y `credentials` solo si es imprescindible. |

### DEF-04 · Medio · Falta de idempotencia en la creación de eventos

| Campo | Detalle |
|---|---|
| Componente | `EventsService.create` |
| Pasos | Enviar dos veces el mismo cuerpo a `POST /events`; enviar 5 POST simultáneos |
| Esperado | Un registro o 409 en el duplicado |
| Actual | 201/201 con ids distintos; 5 POST concurrentes → 5 registros |
| Severidad | **Media** (duplicidad de datos y notificaciones) |
| Evidencia | `http_results.json → pruebas.idempotencia` y `pruebas.escritura_concurrente` |
| Corrección | Clave de idempotencia (`Idempotency-Key`) con almacenamiento temporal, o restricción UNIQUE por `(title, date, time, location)` con manejo de `P2002` → 409. |

### DEF-05 · Medio · Credenciales por defecto y contraseña devuelta por la API

| Campo | Detalle |
|---|---|
| Componente | `AuthService.setupInitialAdmin` |
| Actual | `admin@musicamasvida.com` / `password123`; el endpoint responde con la contraseña en claro |
| Severidad | **Media** (cuenta administrativa con credenciales públicas) |
| Evidencia | Código y login real exitoso (documentado en el reporte de despliegue); `setupInitialAdmin` devuelve `password: defaultPassword` |
| Corrección | Leer correo y contraseña de variables de entorno, obligar cambio en el primer inicio de sesión, no incluir la contraseña en la respuesta y limitar el bootstrap por IP/secreto. |

### DEF-06 · Medio · Validación de tipos ausente en el cliente móvil

| Campo | Detalle |
|---|---|
| Componente | `EventService.isRegistered`, `MobileAuthService.loginWithQr` |
| Pasos | `isRegistered` con `{"registered":"si"}`; `loginWithQr` con 502 y cuerpo HTML |
| Esperado | Error controlado y mensaje amigable |
| Actual | `TypeError` en el cast `as bool?`; `FormatException` porque se decodifica el JSON antes de comprobar `statusCode` |
| Severidad | **Media** (pantalla rota ante respuestas inesperadas) |
| Evidencia | `whitebox_boundary_test.dart` (pruebas “tipo inesperado” y “502 con HTML”) |
| Corrección | Comprobar `statusCode` antes de decodificar, validar `registered is bool` y capturar `FormatException`/`TypeError` en el servicio. |

### DEF-07 · Bajo · Falta de índice para el filtro de eventos activos

| Campo | Detalle |
|---|---|
| Componente | Base de datos, tabla `events` |
| Actual | `GET /events` y `/events/upcoming` hacen `Seq Scan` + `Sort`; no hay índice en `(isActive, date)` ni en `date` |
| Severidad | **Baja** hoy (1 fila), **media** al crecer |
| Evidencia | `db_results.json → pruebas.explain.Q1_listar_activos` |
| Corrección | `CREATE INDEX events_active_date_idx ON events ("isActive", date);` (o índice parcial `WHERE "isActive" = true`) y medir de nuevo con `EXPLAIN ANALYZE`. |

### Hallazgos adicionales (calidad, no funcionales)

- **Dependencias:** `pnpm audit --prod` reporta **45 vulnerabilidades: 5 low, 24 moderate, 15 high, 1 critical** (`evidencias/practica11/pnpm_audit.txt`). Requiere actualización planificada.
- **Lint API:** 149 errores de Prettier/TypeScript, principalmente formato y `any` en controladores. No bloquean la ejecución, pero impiden un pipeline de calidad estricto.
- **Lint web/admin:** solo advertencias (escape innecesario, variables de `catch` sin usar, dependencia faltante en `useEffect`).

---

## 8. Matrices de resultados

### 8.1 Matriz WB (caja blanca)

| ID | Componente / método | Técnica | Cobertura | Resultado | Evidencia |
|---|---|---|---|---|---|
| WB-01 | `UpcomingEvent.fromJson` | Valores límite + tipos | 100 % líneas | ✅ 10 casos | `whitebox_boundary_test.dart`, `event_model_test.dart` |
| WB-02 | `EventProvider.fetchUpcomingEvents` | CFG + estados | 96.9 % líneas | ✅ 7 casos | `whitebox_boundary_test.dart`, `event_provider_unit_test.dart` |
| WB-03 | `EventService.getUpcomingEvents` | CFG (4 caminos) | 97.8 % líneas | ✅ 5 casos | `whitebox_boundary_test.dart` |
| WB-04 | `EventService.isRegistered/registerForEvent` | Condiciones + excepciones | 100 % del flujo | ⚠️ 2 defectos (WB-L06) | `whitebox_boundary_test.dart` |
| WB-05 | `MobileAuthService.loginWithQr` | Condiciones + excepciones | 100 % líneas | ⚠️ DEF-06 | `whitebox_boundary_test.dart` |
| WB-06 | `EventsService.register` (API) | CFG (8 caminos) | 100 % sentencias / 95 % ramas | ✅ 30 pruebas | `events.service.whitebox.spec.ts` |
| WB-07 | `AuthService` (login, QR, PIN) | CFG + condiciones | 98.86 % sent. / 92.5 % ramas | ✅ 20 pruebas | `auth.service.whitebox.spec.ts` |

### 8.2 Matriz WEB (API)

| ID | Caso | Código esperado | Código real | Veredicto |
|---|---|---|---|---|
| WEB-01 | `GET /events` | 200 | 200 | ✅ |
| WEB-02 | `POST /events` (admin) | 201 | 201 | ✅ |
| WEB-03 | `POST /events` sin `description` | 400 | 400 | ✅ |
| WEB-04 | `POST /events` sin token | 401 | 401 | ✅ |
| WEB-05 | `GET /events/{id}` inexistente | 404 | 404 | ✅ |
| WEB-06 | Inscripción duplicada | 409 | 409 | ✅ |
| WEB-07 | `DELETE /events/{id}` | 204 | 204 | ✅ |
| WEB-08 | `POST /events` con rol USER | 403 | **201** | ❌ DEF-02 |
| WEB-09 | `GET /users/admin/all` con rol USER | 403 | **200** | ❌ DEF-02 |
| WEB-10 | Contraseña en respuestas | Ausente | Ausente (login/users) | ✅ |
| WEB-11 | Fecha inválida | 400/422 | 400 | ✅ (422 no aplica) |
| WEB-12 | Idempotencia de `POST /events` | 1 registro / 409 | 2 registros / 201+201 | ❌ DEF-04 |

### 8.3 Matriz DB

| ID | Prueba | Resultado | Veredicto |
|---|---|---|---|
| DB-01 | CRUD completo (INSERT/SELECT/UPDATE/DELETE) | 4 operaciones correctas | ✅ |
| DB-02 | NOT NULL, tipo, UNIQUE, FK | 23502, 22007, 23505, 23503 | ✅ |
| DB-03 | Índices y `EXPLAIN ANALYZE` | PK e índice único usados; falta índice de filtro | ⚠️ DEF-07 |
| DB-04 | Transacción con rollback | No persiste | ✅ |
| DB-05 | Concurrencia de inscripción | 1 OK / 1 × 23505 | ✅ |
| DB-06 | Concurrencia de actualización | Last write wins (sin bloqueo optimista) | ⚠️ Riesgo |
| DB-07 | Tiempos de 4 consultas | 90–101 ms promedio (incluye RTT) | ✅ |
| DB-08 | Limpieza de datos de prueba | 0 residuos | ✅ |

### 8.4 Matriz NET

| ID | Prueba | Resultado | Veredicto |
|---|---|---|---|
| NET-01 | Ping 20 paquetes a la API | 0 % pérdida, 73.9 ms promedio | ✅ |
| NET-02 | 10 solicitudes HTTP | 10/10 × 200, 158.13 ms promedio | ✅ |
| NET-03 | Descarga (API y bundle) | 0.742 Mbps y 17.464 Mbps | ✅ |
| NET-04 | Subida (3 POST) | 0.218–0.234 Mbps | ✅ |
| NET-05 | Carga 1/5/10 usuarios × 20 | 100 % éxito; P95 177/412/491 ms | ✅ |
| NET-06 | Interrupción y recuperación | `TimeoutError` → siguiente 200 en 135.68 ms | ✅ |
| NET-07 | Prevención de duplicados | 409 + UNIQUE 23505; eventos sin idempotencia | ⚠️ DEF-04 |

---

## 9. Respuestas a las 10 preguntas de la práctica

**1. ¿Qué es una prueba de caja blanca y en qué se diferencia de una de caja negra?**
La caja blanca diseña casos a partir del código: se conoce la estructura, las decisiones y los caminos. La caja negra solo usa entradas y salidas contra la especificación. En esta práctica se usó caja blanca para elegir caminos de `EventsService.register` y `EventProvider`, y caja negra para los códigos HTTP de la API desplegada. Ambas se complementan: la caja blanca mide qué parte del código se ejecuta; la negra detecta requisitos ausentes.

**2. ¿Qué es la cobertura de sentencias y cómo se calcula?**
Es el porcentaje de líneas/sentencias ejecutadas al menos una vez por la suite: `sentencias ejecutadas / sentencias totales × 100`. Se obtuvo con `flutter test --coverage` (86.19 % global) y Jest (32.02 % global, 100 % en `events.service.ts`). Una cobertura alta no garantiza que todas las condiciones se hayan evaluado en ambos sentidos.

**3. ¿Qué es la cobertura de ramas y por qué es más fuerte que la de sentencias?**
Exige que cada decisión se evalúe tanto verdadera como falsa. Un `if` con una sola prueba puede dar 100 % de sentencias y 50 % de ramas. En la API se alcanzó 95 % de ramas en `events.service.ts` y 92.5 % en `auth.service.ts`; en Flutter el `lcov` no emitió ramas, por lo que se documentó la cobertura de condiciones con la matriz de la sección 3.5 en lugar de reportar un dato falso.

**4. ¿Qué es la cobertura de condiciones y en qué se diferencia de la de decisiones?**
Una decisión puede combinar varias condiciones con `&&`/`||`. La cobertura de decisiones solo pide que el `if` sea verdadero y falso; la de condiciones exige que **cada condición atómica** tome ambos valores. Por ejemplo, en `register` la condición `!event || !event.isActive` se probó con evento nulo, evento inactivo y evento activo. La forma más estricta es MC/DC, que además exige independencia de cada condición; no se aplicó formalmente por el tamaño del proyecto.

**5. ¿Qué es un grafo de flujo de control (CFG) y cómo se construye?**
Es un grafo dirigido donde los nodos son bloques básicos (sentencias sin bifurcaciones) y las aristas representan el flujo posible. Se construye identificando el inicio, las decisiones (`if`, `while`, `try/catch`, `throw`) y los puntos de unión. En la sección 3.2 se muestran tres CFG: `getUpcomingEvents` (V=3), `fetchUpcomingEvents` (V=5) y `register` (V=8).

**6. ¿Qué es la complejidad ciclomática y cómo se calcula?**
Mide el número de caminos linealmente independientes: `V(G) = E − N + 2` o, equivalentemente, `decisiones + 1`. Para `register`, con 7 decisiones, V=8; para `getUpcomingEvents`, V=3. Un valor alto indica más riesgo y más casos de prueba necesarios.

**7. ¿Qué son los caminos independientes y cómo se derivan?**
Es un conjunto mínimo de caminos tal que cada uno aporta al menos una arista nueva. Se derivan recorriendo el CFG y eligiendo, por cada decisión, una vez la rama verdadera y otra la falsa. En `getUpcomingEvents` los cuatro caminos son: mock, 200, código distinto de 200 y excepción de red. En `register` los ocho caminos corresponden a rol, evento, usuario, duplicado, capacidad, P2002, P2034 y error desconocido; los ocho están cubiertos por pruebas.

**8. ¿Qué son los valores límite y cómo se aplican?**
Son los valores en las fronteras de una condición: el mínimo, el máximo, uno menos y uno más. Se aplicaron en `capacity` (entero positivo, truncamiento de decimales), en `date` (formatos válidos e inválidos), en el JSON vacío y en los códigos HTTP (201 vs 200, 409 vs 201). También en la capacidad del evento: la validación del servicio usa `>= capacity` para rechazar, y se probó el caso de capacidad alcanzada.

**9. ¿Qué papel tienen las pruebas de excepciones y de integración?**
Las de excepción verifican que el sistema falle de forma controlada: sin red, timeout, 500, JSON inválido, duplicados. Se comprobó que el provider muestra un error y no datos falsos, que la API traduce `P2002`/`P2034` a 409 y que el rollback no deja datos. Las de integración comprueban el contrato real entre capas (Flutter ↔ API ↔ PostgreSQL), donde aparecieron los defectos más graves (roles y bootstrap) que los mocks no habrían revelado.

**10. ¿Qué limitaciones tiene la cobertura y por qué no se debe perseguir el 100 % artificialmente?**
La cobertura mide ejecución, no corrección: se puede ejecutar una línea y no verificar su resultado. Perseguir 100 % con pruebas triviales produce falsa confianza y mantiene código muerto. En este proyecto se dejaron sin cubrir `auth_provider.dart`, controladores y DTOs porque se validaron por integración real o no son críticos, y se justificó cada ausencia. La meta fue cubrir los caminos de negocio y de error, no inflar el número.

---

## 10. Conclusiones

1. La lógica de negocio del módulo de eventos está bien cubierta: **100 % de sentencias** en `EventsService` y **96–100 % de líneas** en los archivos móviles críticos.
2. La calidad de la **autorización** es el punto más débil: el backend confunde “tener token” con “tener permiso”, lo que permite a un alumno administrar eventos y obtener tokens sin credenciales.
3. La base de datos es consistente: restricciones, claves foráneas y UNIQUE funcionan, y el rollback es correcto; falta un índice para el filtro principal y un control de concurrencia optimista en `UPDATE`.
4. El rendimiento es aceptable para el plan gratuito: 100 % de éxito hasta 10 usuarios concurrentes, con P95 de 491 ms; el costo dominante es la latencia de red (≈74 ms de ping), no el procesamiento.
5. La estrategia de pruebas debe priorizar la corrección de DEF-01 y DEF-02 antes de cualquier entrega, y añadir pruebas de regresión de autorización.

---

## Anexo A — Archivos de evidencia

| Archivo | Contenido |
|---|---|
| `evidencias/practica11/flutter_test_clean.txt` | Salida de la suite Flutter (48 pruebas) |
| `evidencias/practica11/flutter_analyze.txt` | `flutter analyze` sin issues |
| `apps/mobile/coverage/lcov.info` | Cobertura de líneas móvil |
| `evidencias/practica11/api_jest_final.txt` | Cobertura y resultados de Jest (57 pruebas) |
| `evidencias/practica11/db_results.json` | Resultados estructurados de BD |
| `evidencias/practica11/db_whitebox.log` | Log completo de BD con `EXPLAIN ANALYZE` |
| `evidencias/practica11/http_results.json` | Códigos, tiempos, carga, idempotencia y limpieza |
| `evidencias/practica11/http_stdout.txt` | Salida legible del script HTTP |
| `evidencias/practica11/authz_results.json` | Prueba de escalamiento de privilegios |
| `evidencias/practica11/pnpm_audit.txt` | 45 vulnerabilidades de dependencias |
| `evidencias/practica11/eslint_api.txt` | 149 errores de lint de la API |
| `evidencias/practica11/oxlint_web.txt`, `oxlint_admin.txt` | Advertencias de lint web/admin |
| `evidencias/practica11/scripts/db_whitebox.mjs` | Código fuente de las pruebas de BD |
| `evidencias/practica11/scripts/http_whitebox.mjs` | Código fuente de las pruebas HTTP/carga |

## Anexo B — Reproducción

```powershell
# Móvil
cd apps/mobile
flutter pub get
flutter analyze
flutter test --coverage

# API
pnpm --filter api test -- --coverage

# Base de datos (requiere .env.practica11 con DATABASE_URL)
node evidencias/practica11/scripts/db_whitebox.mjs

# HTTP, carga y conectividad
node evidencias/practica11/scripts/http_whitebox.mjs
Test-Connection -ComputerName musica-masvida-api.onrender.com -Count 20
```

> **Nota de seguridad:** la cadena de conexión de Neon y las credenciales locales no se incluyen en este documento ni en los archivos versionados; `.env.practica11` está en `.gitignore`. Antes de la entrega debe cambiarse la contraseña del administrador `admin@musicamasvida.com`, que se creó con la contraseña por defecto documentada en DEF-05.
