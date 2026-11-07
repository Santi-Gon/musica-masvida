# Práctica: comunicación, transferencia e integridad de datos

**Proyecto:** Música Más Vida  
**Estudiante:** Santiago González Aguirre  
**Funcionalidad evaluada:** consulta e inscripción de un alumno a un evento desde Flutter  
**Entorno:** ejecución local  
**Fecha de ejecución:** No registrada (pruebas parciales)

> **Estado del reporte:** ya probé desde mi teléfono el acceso al endpoint local, el inicio de sesión por QR, la inscripción a un evento y que el alumno aparece en la sección de inscritos de administración. Aún falta guardar las capturas y completar las comprobaciones de integridad detallada, duplicados e interrupción/recuperación de red.

## 1. Aplicación y funcionalidad evaluada

Música Más Vida es un sistema para una escuela de música. Su aplicación móvil, desarrollada en Flutter, permite iniciar sesión mediante un QR temporal generado en el portal web, consultar eventos próximos e inscribirse a un evento. Para esta práctica seleccioné la inscripción, porque implica enviar información desde el teléfono, guardarla en el servidor y consultarla nuevamente.

El QR sirve para iniciar sesión. Para probar la transferencia de una inscripción, primero inicio sesión en Flutter escaneándolo y después selecciono el evento desde la aplicación móvil.

## 2. Componentes y comunicación

### Componente que se conecta

En Flutter, `EventDetailScreen` inicia y presenta la inscripción. `EventProvider` coordina la operación y `EventService` envía las peticiones HTTP. El usuario autenticado se identifica con un token JWT enviado en el encabezado `Authorization`.

### Servicio al que se conecta

La aplicación se conecta a la API REST desarrollada con NestJS. La API utiliza Prisma para almacenar los eventos y las inscripciones en PostgreSQL.

### Protocolo

Se utiliza **HTTP** en el entorno local de pruebas. En un teléfono físico Flutter se conecta a la dirección IPv4 local de la computadora. `10.0.2.2` se reserva para el emulador Android; usarla en mi teléfono físico provocó un timeout. Al cambiar la URL a la IP local de mi computadora pude continuar con la prueba. Este HTTP sin cifrado es solo para la demostración local.

### Información enviada y recibida

| Operación | Petición | Información que se envía | Respuesta esperada |
|---|---|---|---|
| Consultar eventos | `GET /api/v1/events/upcoming` | No requiere cuerpo ni token. | `200 OK` y una lista JSON de eventos. |
| Consultar mi inscripción | `GET /api/v1/events/{id}/registration` | ID del evento en la URL y JWT en `Authorization: Bearer <JWT>`. | `200 OK` y `{"registered": true}` o `{"registered": false}`. |
| Inscribirme | `POST /api/v1/events/{id}/register` | ID del evento en la URL y JWT en `Authorization: Bearer <JWT>`. No requiere cuerpo JSON. | `201 Created` y los datos del registro, como `id`, `eventId`, `userId` y `createdAt`. |
| Consultar inscritos (administración) | `GET /api/v1/events/admin/{id}/registrations` | ID del evento y JWT de administrador. | `200 OK`, evento, total y registros con nombre y correo del usuario. |

El servidor obtiene el ID del alumno del JWT; la aplicación no lo envía como un campo modificable en el cuerpo de la solicitud. La API limita la inscripción a una por usuario y evento y verifica los lugares disponibles.

## 3. Diagrama del flujo de comunicación

```text
Portal web                         Aplicación Flutter
    |                                     |
    |-- genera QR temporal ---------------|
    |                                     |-- POST /auth/mobile-login
    |                                     |   intercambia el QR por un JWT
    |                                     |<-- 200 OK + JWT
    |                                     |
    |                                     |-- GET /events/upcoming
    |                                     |<-- 200 OK + lista de eventos
    |                                     |
    |                                     |-- POST /events/{id}/register
    |                                     |   Authorization: Bearer JWT
    |                                     |<-- 201 Created + registro
    |                                     |
    |                             API NestJS
    |                                     |
    |                             Prisma / PostgreSQL
    |                                     |
    | Panel de administración <-- GET inscritos del evento
    |<---------- muestra al alumno inscrito
```

La consulta y visualización de eventos también se comprueba directamente en Flutter. Para verificar la persistencia de la inscripción, comparo el evento y el alumno que aparecen en la app con el registro que devuelve administración.

## 4. Preparación y ejecución

Desde PowerShell, en la raíz del proyecto:

1. Inicié Docker Desktop y levanté PostgreSQL:

   ```powershell
   cd C:\Proyectos\musica-masvida
   pnpm run db:up
   Test-NetConnection 127.0.0.1 -Port 5432
   ```

   Antes de continuar, comprobé que PostgreSQL estuviera disponible.

2. Revisé `apps/api/.env` y verifiqué que `DATABASE_URL` apuntara a la base local `musica_mas_vida`. No incluí ni compartí valores secretos del archivo.

3. Generé el cliente y apliqué las migraciones:

   ```powershell
   pnpm prisma:generate
   pnpm --filter api exec prisma migrate deploy
   ```

4. Si la base todavía no tenía datos de prueba, cargué el seed una sola vez:

   ```powershell
   pnpm --filter api exec prisma db seed
   ```

   Evité volver a ejecutarlo innecesariamente porque puede crear eventos adicionales.

5. Inicié la API, el sitio web y administración en otra terminal:

   ```powershell
   $env:VITE_API_URL = 'http://localhost:3000'
   pnpm run dev
   ```

   Dejé esta terminal abierta y anoté las direcciones mostradas por los servidores. Los servicios locales estuvieron disponibles durante la prueba del QR.

6. Abrí el sitio web local, inicié sesión con el usuario de prueba y generé un QR nuevo. En Flutter escaneé ese QR y el inicio de sesión funcionó después de configurar la dirección de la API con la IPv4 de mi computadora.

7. Me inscribí a un evento desde Flutter y confirmé que el alumno aparece en la sección de inscritos de administración. Aún debo guardar capturas y completar la comparación detallada de los datos.

### URL de la API para Flutter

- **Emulador Android:**

  ```powershell
  cd C:\Proyectos\musica-masvida\apps\mobile
  flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
  ```

- **Teléfono físico:** conecté el teléfono y la computadora a la misma Wi-Fi, consulté `ipconfig` y sustituí la IP de ejemplo por la IPv4 local real:

  ```powershell
  flutter run --dart-define=API_BASE_URL=http://192.168.1.25:3000/api/v1
  ```

  `192.168.1.25` es solamente un ejemplo: usé la IPv4 real de mi computadora. Comprobé que el teléfono podía abrir la respuesta JSON de `http://IP-DE-MI-PC:3000/api/v1/events/upcoming`.

## 5. Evidencias y dónde anexarlas

Guardo las imágenes en una carpeta `evidencias/` junto a este reporte. Para que aparezcan dentro del documento, agrego las imágenes inmediatamente debajo de la tabla, en el mismo orden, con `![Descripción](evidencias/nombre.png)`. Las capturas siguen pendientes de anexar; no afirmo que ya existan.

| Captura | Qué debe mostrar | Archivo sugerido |
|---|---|---|
| Conexión a la API | En el navegador del teléfono, el JSON de próximos eventos y la URL local visible. | `evidencias/01_conexion_eventos.png` |
| Inicio de sesión QR | Flutter después de iniciar sesión correctamente. No mostrar el contenido del QR ni el JWT. | `evidencias/02_login_qr.png` |
| Envío/resultado en Flutter | Evento y confirmación de inscripción o estado «Ya estás inscrito». | `evidencias/03_inscripcion_flutter.png` |
| Registro en administración | Página Eventos/Inscritos con el evento, alumno inscrito y total visible. Ocultar correos/datos no necesarios. | `evidencias/04_inscrito_admin.png` |
| Fallo de conexión (pendiente) | Mensaje de error en Flutter tras desactivar Wi-Fi e intentar consultar o enviar. | `evidencias/05_sin_conexion.png` |
| Recuperación (pendiente) | Flutter después de reactivar Wi-Fi y repetir la operación satisfactoriamente. | `evidencias/06_recuperacion.png` |
| Prevención de duplicados (pendiente) | Resultado del segundo intento y lista/total de inscritos que permita comprobar que no se agregó otro registro. | `evidencias/07_sin_duplicado.png` |
| Respuesta HTTP (opcional) | Registro del servicio o herramienta que muestre el código HTTP real, si se logra capturar. | `evidencias/08_respuesta_http.png` |

**Cómo insertarlas:** debajo de la tabla, agrego una línea Markdown para cada imagen, por ejemplo `![JSON de eventos abierto en el teléfono](evidencias/01_conexion_eventos.png)`. No incluyo tokens, contraseñas ni secretos. No hace falta una captura separada del código HTTP si no tengo una herramienta que lo muestre; anoto únicamente el código que observé.

## 6. Comparación de integridad de datos

La inscripción no envía un formulario con campos de perfil. Envía el ID del evento en la URL y la identidad del alumno en el JWT. Para completar la verificación de integridad debo comparar:

1. El evento seleccionado en Flutter con el evento que aparece en administración.
2. El nombre y el correo de la sesión del alumno con el alumno que aparece en la lista de inscritos.
3. Que el total de inscritos aumente en uno después de una inscripción nueva.
4. Que la consulta de estado del mismo usuario y evento indique `registered: true`.
5. Que un segundo intento para el mismo evento no cree una segunda fila.

**Resultado real de la comparación:** confirmé que el alumno aparece en la sección de inscritos de administración. Aún debo comparar y anotar el nombre, evento y total antes/después, comprobar el estado de inscripción desde Flutter y verificar que no haya duplicados.
**Evento utilizado:** ____________________  
**Alumno mostrado en Flutter:** ____________________  
**Alumno mostrado en administración:** ____________________  
**Total antes / después:** __________ / __________  
**¿Los datos coincidieron?:** Sí / No  
**Observaciones:** ____________________

## 7. Matriz de pruebas

TC-01, TC-02 y TC-03 están comprobados según los resultados parciales descritos abajo. TC-04 está parcialmente comprobado porque el alumno aparece en administración, pero falta completar la comparación de campos y cantidades. TC-05, TC-06 y TC-07 siguen pendientes. No marco como realizado un caso sin ejecutarlo.

| ID | Prueba y pasos | Resultado esperado | Resultado observado / estado | Evidencia |
|---|---|---|---|---|
| TC-01 | Abrí desde el navegador del teléfono la URL local de próximos eventos y probé el inicio de sesión por QR desde Flutter. | Se establece la conexión; la API devuelve JSON y Flutter inicia sesión. | **Aprobado parcialmente.** El teléfono mostró el JSON y Flutter aceptó un QR nuevo al usar la IP local de la computadora. No anoté el código HTTP ni el tiempo. | Pendiente de capturar: `01_conexion_y_eventos.png` |
| TC-02 | Inicié sesión en Flutter, abrí un evento y me inscribí. | El servidor recibe la petición autenticada y Flutter confirma la inscripción. | **Aprobado.** Pude inscribirme desde el teléfono. No anoté el código HTTP ni el tiempo de respuesta. | Pendiente de captura: `03_inscripcion_flutter.png` |
| TC-03 | Abrí la sección de inscritos en administración después de inscribirme. | El registro del alumno aparece en el evento correspondiente. | **Aprobado.** Confirmé que el alumno aparece en Inscritos en administración. Falta guardar la captura. | Pendiente de captura: `04_inscrito_admin.png` |
| TC-04 | Comparé el evento, alumno y total de inscripciones entre Flutter y administración. | Los datos coinciden y no hay campos inesperados ni alterados. | **Parcial.** Confirmé que el alumno aparece en administración; aún falta comparar/anotar los datos y el total antes/después. | Pendiente: `04_inscrito_admin.png` y registro de comparación |
| TC-05 | Desactivé la Wi-Fi o interrumpí la conexión e intenté consultar o inscribirme. | Flutter muestra el error; no confirma una inscripción que el servidor no haya aceptado. | Pendiente de ejecutar. El timeout inicial fue causado por usar `10.0.2.2` en un teléfono físico; no fue una prueba con Wi-Fi desactivada. | `05_sin_conexion.png` |
| TC-06 | Reactivé la red, mantuve la API activa y volví a intentar la operación. | La conexión se recupera y solo se muestra éxito si el servidor confirma la operación. | Pendiente de ejecutar tras una interrupción real. Al corregir la URL de Flutter a la IP local sí pude iniciar sesión con QR. | `06_recuperacion.png` |
| TC-07 | Intenté inscribirme dos veces en el mismo evento con la misma cuenta. | No se crea un registro duplicado; el segundo intento se rechaza, normalmente con `409 Conflict`. | Pendiente de ejecutar. | `07_sin_duplicado.png` |

### Registro de una transferencia final

| Dato | Resultado real |
|---|---|
| Evento de prueba | ____________________ |
| Fecha y hora de la prueba | ____________________ |
| Tiempo aproximado desde pulsar «Inscribirme» hasta ver la confirmación | __________ ms / s |
| Código HTTP observado para la inscripción nueva | __________ |
| Código HTTP observado para el intento duplicado, si se verificó | __________ |
| Número de registros antes y después | __________ / __________ |
| ¿Coincidieron los datos de app, API y administración? | Sí / No |
| Comportamiento ante el error de red | ____________________ |
| Resultado global | Aprobado / Fallido / Parcial |

Para medir el tiempo, usé un cronómetro desde que pulsé **Inscribirme al evento** hasta que apareció la confirmación en Flutter y anoté el valor observado. No asigné un tiempo supuesto. El endpoint HTTP tiene un límite de espera de diez segundos en Flutter; si se supera, la petición debe tratarse como error, no como una inscripción exitosa.

## 8. Interpretación técnica de errores y recuperación

- Para el evento que se está inscribiendo, la API responde `201 Created` si la operación se registra correctamente.
- Si el usuario ya se inscribió o no quedan lugares, la API rechaza la operación con un conflicto (`409`). Flutter muestra el mensaje de error en el detalle y no cambia la acción a **Ya estás inscrito**.
- Si la API no está disponible o se interrumpe la red, no llega una confirmación HTTP satisfactoria. Flutter debe mostrar el error de comunicación y permitir volver a intentar cuando se recupere la conexión.
- El resultado válido de recuperación se confirma haciendo un nuevo intento con la conexión activa y verificando el registro en administración. La lista administrativa se actualiza aproximadamente cada cinco segundos.

En esta práctica, la integridad significa que la inscripción persistida corresponde al evento seleccionado y al usuario autenticado, sin cambios inesperados ni duplicados. Una respuesta exitosa por sí sola no demuestra la integridad: debo comparar el registro almacenado con lo que muestra Flutter.

## 9. Conclusión

En esta prueba confirmé desde mi teléfono físico que puedo abrir el JSON de próximos eventos de la API local, iniciar sesión escaneando un QR e inscribirme a un evento desde Flutter. También revisé la sección de inscritos de administración y encontré allí al alumno, por lo que comprobé que la inscripción llegó al servicio y se refleja en el sistema administrativo. Al principio, el escaneo terminaba en timeout porque había configurado la app con `10.0.2.2`, dirección que sirve para el emulador y no para un celular físico. Cambié la configuración para utilizar la IPv4 local de mi computadora y el QR funcionó. No registré el tiempo de respuesta ni el código HTTP, y todavía debo comparar con más detalle el evento, los datos del alumno y el total antes y después de la inscripción. Tampoco he intentado inscribirme dos veces ni he desactivado la Wi-Fi para probar cómo responde la app ante una interrupción y su recuperación. Por eso, considero comprobados el acceso local, el inicio de sesión y el envío con aparición del registro en administración; la práctica sigue parcial. Para completarla, anexaré las capturas indicadas y ejecutaré los casos de integridad, duplicados y conectividad interrumpida.

## 10. Checklist antes de entregar

- [ ] Inicié la API y PostgreSQL locales y completé las pruebas funcionales.
- [ ] Cambié los estados **Pendiente** de la matriz por los resultados que observé.
- [ ] Anoté el evento, el tiempo medido y los códigos HTTP comprobados.
- [ ] Comparé el alumno y el evento entre Flutter y administración.
- [ ] Probé la interrupción de red y la recuperación.
- [ ] Guardé capturas o video reales en `evidencias/`.
- [ ] Completé la conclusión con los resultados reales y verifiqué que tenga entre 150 y 200 palabras.
- [ ] Oculté tokens, contraseñas, secretos y archivos `.env` en las evidencias.
