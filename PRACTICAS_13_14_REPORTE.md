# Prácticas 13 y 14 — Automatización de pruebas y CI

## Alcance y componentes críticos

La aplicación móvil está desarrollada en Flutter y consume una API NestJS; no implementa persistencia local. Se seleccionaron: (1) inscripción del alumno a un evento, (2) comunicación HTTP de `EventService` con `/events/upcoming` y `/events/:id/register`, y (3) persistencia remota de la inscripción mediante la transacción Prisma del API.

Como riesgo previo se retomó DEF-06 de la práctica 11: una respuesta con `registered` de tipo inesperado podía lanzar `TypeError`, y un 502 con HTML se intentaba decodificar como JSON antes de revisar el código HTTP. También se tomó como riesgo de escritura el reintento de una inscripción sin conservar una clave de idempotencia. Se añadieron pruebas de regresión; el cliente ahora valida los tipos y prioriza el estado HTTP, y los reintentos de inscripción reutilizan la misma clave.

## Pruebas y matriz de automatización

Las pruebas nuevas están en [`practica13_14_automation_test.dart`](apps/mobile/test/practica13_14_automation_test.dart). Se añadieron cinco casos unitarios: respuesta válida, campos vacíos/nulos, fecha inválida y capacidad decimal, error HTTP 500 sin reintento, y código QR vacío. Las pruebas de integración conectan Provider, Service, cliente HTTP y modelo; verifican éxito y error 500. La prueba de persistencia valida el contrato de inscripción autenticada (201) e idempotencia en reintentos. El API prueba la creación de la inscripción dentro de la transacción en [`events.service.spec.ts`](apps/api/src/modules/events/events.service.spec.ts).

| ID | Tipo | Validación | Resultado |
|---|---|---|---|
| AUT-01 | Unitaria | Conversión de evento válido, incluida fecha ISO | Aprobada |
| AUT-02 | Unitaria | Campos ausentes o nulos y valores predeterminados | Aprobada |
| AUT-03 | Unitaria | Fecha inválida y capacidad decimal; incluye casos de error HTTP y QR vacío | Aprobada |
| AUT-04 | Integración | Provider → Service → HTTP → modelo, respuesta exitosa | Aprobada |
| AUT-05 | Integración | HTTP 500 reflejado como estado de error del Provider | Aprobada |
| AUT-06 | Persistencia | Inscripción 201 autenticada y clave estable al reintentar; transacción API | Aprobada en pruebas automatizadas |
| AUT-07 | CI | Ejecución de Flutter analyze/test y Jest en push | Re-ejecución tras corregir el comando de Jest |
| AUT-08 | CI | Ejecución automática en pull request | Configurada; falta ejecución remota |

La app no guarda inscripciones en el dispositivo: la persistencia pertenece al backend. La prueba Flutter simula el contrato HTTP; la prueba Jest verifica la llamada de escritura dentro de la transacción Prisma, sin conectarse a una base de datos real en esta ejecución. Para validación de base de datos real, consultar las evidencias de la práctica 11.

## Resultados de validación

Ejecución local final del 18 de noviembre de 2026:

- Flutter: **57 pruebas aprobadas, 0 fallidas**, en aproximadamente 2 s. Se ejecutaron nueve archivos de prueba; se excluyeron los benchmarks/resiliencia de la práctica 12 porque escriben sobre sus evidencias de referencia.
- `flutter analyze`: **sin problemas**, 4.1 s.
- API: **57 pruebas aprobadas, 0 fallidas**, cinco suites, 4.098 s en la ejecución final local.
- Tiempo acumulado aproximado de estos comandos: **10.2 s**. Los comandos se ejecutaron por separado y sus tiempos individuales se reportan arriba.
- Durante la primera ejecución falló una expectativa antigua que exigía un mensaje genérico para errores con `message` en lista. Se actualizó la prueba para verificar los detalles del servidor; la repetición final pasó. No quedan errores conocidos de estas validaciones.
- El primer push ejecutó correctamente el job Flutter, pero el job API falló porque `pnpm` pasó un `--` extra a Jest y este interpretó `--runInBand` como patrón de archivo. Se quitó el separador redundante; el comando corregido pasó localmente (57/57). El push siguiente volverá a validar ambos jobs.

Reproducción desde la raíz:

```powershell
Set-Location apps/mobile
flutter analyze
flutter test --reporter expanded `
  test\event_flow_e2e_test.dart test\event_integration_test.dart `
  test\event_model_test.dart test\event_provider_unit_test.dart `
  test\event_registration_service_test.dart test\mobile_auth_service_test.dart `
  test\practica13_14_automation_test.dart test\whitebox_boundary_test.dart `
  test\widget_test.dart
Set-Location ..\..
pnpm --filter api test -- --runInBand
```

En local se dejaron fuera `mobile_performance_test.dart` y
`resilience_practica12_test.dart`, pues escriben sobre archivos de evidencia de
la práctica 12. GitHub Actions ejecutará la suite completa en un runner limpio.

## CI y conclusión

El workflow [`flutter-mobile-ci.yml`](.github/workflows/flutter-mobile-ci.yml) ejecuta análisis y pruebas Flutter, además de Jest para el API, en cada `push` y `pull_request`. El primer push confirmó el job Flutter y reveló el error de argumentos de Jest descrito arriba; se corrigió y se publicó un segundo push. La ejecución final queda pendiente de confirmación en **Actions**. AUT-08 está configurada, pero no se creó un pull request en esta práctica.

La automatización conserva la calidad al convertir contratos y errores conocidos en verificaciones repetibles. Así, cambios en el parseo, la comunicación o la escritura remota pueden detectarse antes de integrar una modificación, y el pipeline entrega una señal común a cada integrante del equipo.
