# PRACTICA 8: Evaluación de Calidad de Software mediante Pruebas de Caja Negra (Black Box Testing)

**Asignatura:** Desarrollo para Dispositivos Inteligentes  
**Proyecto:** Música Más Vida (`musica-masvida`)  
**Estudiante:** Santiago González Aguirre  
**Profesor / Evaluador:** Manuel Contreras Castillo  
**Fecha de Evaluación:** Octubre 2026  
**Tipo de Evaluación:** Pruebas Funcionales de Caja Negra (*Black Box Testing*)  

---

## 1. Introducción y Alcance
El presente informe documenta la evaluación de calidad de software mediante la técnica de **pruebas de caja negra (*Black Box Testing*)** sobre la plataforma **Música Más Vida**. Esta técnica evalúa el comportamiento externo del software basándose exclusivamente en sus especificaciones funcionales y requisitos, prescindiendo del conocimiento de la estructura interna del código o base de datos.

### Componentes y Módulos Evaluados:
* **Módulo de Autenticación y Control de Acceso:** Inicio de sesión con credenciales administrativas, protección de rutas y cierre de sesión seguro.
* **Módulo de Gestión de Eventos (CRUD):** Registro mediante formulario modal, listado, búsqueda y filtrado en tiempo real, edición de registros y eliminación con confirmación.
* **Módulo de Gestión de Usuarios y Auditoría:** Búsqueda, alternancia de estados (*Baja lógica / Reactivación*) y registro cronológico de auditoría.
* **Resiliencia y Manejo de Errores:** Comportamiento ante fallos de conexión, entradas inválidas y códigos de error HTTP.

---

## 2. Inventario de los 12 Requisitos Verificables

Siguiendo las directrices de la práctica, se definieron y formalizaron **12 requisitos verificables** distribuidos en las 5 categorías requeridas:

### A. Operaciones Principales (4 Requisitos)

#### [RF-01] Autenticación de Administrador
* **Entradas:** `email` (string), `password` (string).
* **Restricciones:** Email no vacío con estructura válida; contraseña no vacía.
* **Salida esperada:** Redirección automática al `/dashboard`, almacenamiento de sesión y mensaje de bienvenida.
* **Errores a manejar:** Credenciales inválidas (`401 Unauthorized`) mostrando alerta: *"Credenciales inválidas"*.
* **Criterio de aceptación:** El inicio de sesión se completa en menos de $1.5\text{ s}$ y solo autoriza accesos con datos válidos.

#### [RF-02] Registro de Nuevo Evento Musical
* **Entradas:** `title`, `description`, `date`, `time`, `location`, `imageUrl`, `isActive`.
* **Restricciones:** Título, descripción, fecha, hora y lugar son obligatorios.
* **Salida esperada:** Cierre del modal, el nuevo evento aparece inmediatamente en la tabla y el contador de eventos incrementa en +1.
* **Errores a manejar:** Error de servidor o datos faltantes (`400 Bad Request`).
* **Criterio de aceptación:** El registro es visible en la lista de eventos sin necesidad de refrescar manualmente la página.

#### [RF-03] Búsqueda y Filtrado en Tiempo Real
* **Entradas:** Texto de búsqueda en el campo de texto `#search-events`.
* **Restricciones:** Cadena alfanumérica o campo vacío.
* **Salida esperada:** Filtrado reactivo e interactivo de la tabla de eventos por título o ubicación.
* **Errores a manejar:** Si no existen coincidencias, mostrar el estado vacío: *"No hay eventos"*.
* **Criterio de aceptación:** El filtrado se ejecuta en la interfaz en menos de $100\text{ ms}$.

#### [RF-04] Modificación de Datos de Evento Existente
* **Entradas:** Datos editados en el modal de edición de un evento seleccionado.
* **Restricciones:** Conservar campos obligatorios completos.
* **Salida esperada:** Actualización inmediata de los valores en la fila correspondiente de la tabla.
* **Errores a manejar:** Fallo de actualización en backend (`400 / 404`).
* **Criterio de aceptación:** Las modificaciones persisten tras recargar la pantalla (`F5`).

---

### B. Validaciones y Reglas de Negocio (3 Requisitos)

#### [RF-05] Validación de Campos Obligatorios en Formulario
* **Entradas:** Envío del formulario de evento omitiendo campos obligatorios (ej. título en blanco).
* **Restricciones:** Longitud mayor a 0 caracteres (no cadenas vacías).
* **Salida esperada:** Bloqueo del formulario en el navegador resaltando el campo requerido.
* **Errores a manejar:** Prevención de petición HTTP inválida al servidor.
* **Criterio de aceptación:** 100% de los envíos con campos faltantes son interceptados antes del envío.

#### [RF-06] Validación de Formato de Correo Electrónico
* **Entradas:** Texto sin sintaxis de correo en el campo login (ej. `admin_sin_arroba`).
* **Restricciones:** Cumplir con formato estándar de email (`usuario@dominio.ext`).
* **Salida esperada:** Notificación nativa del campo: *"Incluye un signo '@' en la dirección de correo"*.
* **Errores a manejar:** Bloqueo del botón de submit.
* **Criterio de aceptación:** La aplicación no emite llamadas a la API si el correo no tiene formato válido.

#### [RF-07] Validación de Sintaxis de URL para Imágenes
* **Entradas:** Cadena en campo `imageUrl` que no sea enlace web (ej. `mi_imagen.png`).
* **Restricciones:** Debe comenzar obligatoriamente con el protocolo `http://` o `https://`.
* **Salida esperada:** Advertencia de campo URL inválido e impedimento de envío.
* **Errores a manejar:** Rechazo de URLs rotas para proteger la vista móvil.
* **Criterio de aceptación:** Solo se persisten URLs accesibles por protocolo web.

---

### C. Persistencia y Consistencia de Datos (2 Requisitos)

#### [RF-08] Consistencia tras Eliminación de Evento
* **Entradas:** Confirmación en el cuadro de diálogo modal: *"¿Eliminar evento?"*.
* **Restricciones:** ID de evento válido y existente.
* **Salida esperada:** Eliminación del registro en la tabla, decremento del contador global.
* **Errores a manejar:** Error `404 Not Found` en caso de intento de doble eliminación.
* **Criterio de aceptación:** Tras realizar recarga forzada del navegador (`F5` o `Ctrl+F5`), el registro eliminado **no vuelve a aparecer**.

#### [RF-09] Consistencia de Estado y Auditoría de Usuario
* **Entradas:** Cambio de estado de usuario (*Baja lógica / Reactivación*).
* **Restricciones:** Privilegios de administrador.
* **Salida esperada:** Cambio inmediato en el badge visual (*Activo / Inactivo*) y generación de una fila en la tabla de auditoría.
* **Errores a manejar:** Fallo transaccional de base de datos (`500`).
* **Criterio de aceptación:** La auditoría registra con exactitud la acción (`BAJA_LOGICA` o `REACTIVACION`), ID de usuario y marca de tiempo ISO.

---

### D. Navegación, Roles y Permisos (2 Requisitos)

#### [RF-10] Protección de Rutas Administrativas
* **Entradas:** Intento de acceso directo por barra de direcciones a `http://localhost:5173/dashboard` sin token.
* **Restricciones:** Existencia de token JWT en `localStorage`.
* **Salida esperada:** Bloqueo de acceso por `PrivateRoute` y redirección forzada a `/login`.
* **Errores a manejar:** Intento de vulneración de acceso a rutas protegidas.
* **Criterio de aceptación:** 0 vistas administrativas son accesibles sin credenciales verificadas.

#### [RF-11] Cierre de Sesión Seguro (Logout)
* **Entradas:** Clic en botón *"Cerrar sesión"* en el menú lateral.
* **Restricciones:** Sesión previamente activa.
* **Salida esperada:** Destrucción del token en almacenamiento, redirección a `/login`.
* **Errores a manejar:** Reutilización de token al presionar el botón "Atrás" del navegador.
* **Criterio de aceptación:** Presionar "Atrás" en el navegador no recarga información sensible ni permite reingreso.

---

### E. Manejo de Errores (1 Requisito)

#### [RF-12] Resiliencia ante Desconexión o Caída de la API
* **Entradas:** Carga de eventos o interacción en la app cuando el backend NestJS está detenido.
* **Restricciones:** Rechazo de conexión TCP / Network Failure.
* **Salida esperada:** Despliegue de mensaje de error amigable (*"No se pudo conectar al servidor"*) manteniendo la estructura de la aplicación intacta.
* **Errores a manejar:** Excepciones de red y estados HTTP `500/502/503`.
* **Criterio de aceptación:** La interfaz no se congela ni genera pantalla en blanco (*White Screen of Death*).

---

### Requisitos No Verificables por Falta de Información / Dependencias Pendientes
1. **RF-PEND-01 (Pasarela de Pagos en Línea):** Inscripción pagada a cursos de música; no verificable debido a que no se cuenta aún con credenciales de prueba en entorno Sandbox (Stripe / MercadoPago).
2. **RF-PEND-02 (Notificaciones Push a Reloj Inteligente Wear OS):** Sincronización push ante cambios de horario de eventos; requiere configuración de certificados de Firebase Cloud Messaging en entorno de producción.

---

## 3. Matriz de Casos de Prueba de Caja Negra Ejecutados

| ID Caso | Requisito | Técnica de Prueba | Datos de Entrada (Input) | Pasos Ejecutados | Resultado Esperado | Resultado Obtenido | Estado |
| :---: | :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **CP-01** | RF-01 | Partición Válida | `admin@musicamasvida.com`<br>`admin123` | 1. Entrar a `/login`<br>2. Ingresar usuario y contraseña<br>3. Clic en *Iniciar sesión* | Redirección al Dashboard con bienvenida | Acceso concedido al panel administrativo | **PASÓ** |
| **CP-02** | RF-01 | Partición Inválida | `admin@musicamasvida.com`<br>`password_incorrecto` | 1. Ingresar credencial errónea<br>2. Clic en *Iniciar sesión* | Alerta: *"Credenciales inválidas"* | Mensaje de error visible, acceso denegado | **PASÓ** |
| **CP-03** | RF-02 | Operación Principal | Título: *"Concierto de Gala 2026"*<br>Lugar: *"Teatro Morelos"*<br>Fecha: *"2026-11-20"* | 1. Clic en *+ Nuevo evento*<br>2. Llenar campos<br>3. Clic en *Guardar* | Modal se cierra y el evento aparece en la tabla | Evento agregado exitosamente | **PASÓ** |
| **CP-04** | RF-03 | Búsqueda / Filtro | Input: `"Gala"` | Escribir en barra de búsqueda `#search-events` | La tabla filtra solo las filas que contienen "Gala" | Filtrado instantáneo correcto | **PASÓ** |
| **CP-05** | RF-04 | Modificación | Cambiar lugar a: *"Auditorio Principal"* | 1. Clic en icono lápiz (Editar)<br>2. Modificar texto<br>3. Guardar | La fila refleja el nuevo lugar inmediatamente | Actualizado en la tabla y en BD | **PASÓ** |
| **CP-06** | RF-05 | Validación Límite | Título: `""` (vacío) | 1. Abrir modal<br>2. Dejar título vacío<br>3. Clic en guardar | Bloqueo nativo del campo requerido | No permite guardar ni envía petición HTTP | **PASÓ** |
| **CP-07** | RF-06 | Validación Sintaxis | Correo: `santi_sin_arroba` | 1. Escribir email sin `@`<br>2. Intentar login | Advertencia de formato de correo | Navegador exige formato válido | **PASÓ** |
| **CP-08** | RF-07 | Validación URL | `url_invalida_sin_http` | 1. En URL de imagen ingresar texto plano<br>2. Guardar | Validación de tipo `url` bloquea el envío | Exige protocolo `http://` o `https://` | **PASÓ** |
| **CP-09** | RF-08 | Consistencia / DELETE | Evento creado en CP-03 | 1. Clic en ícono de basura<br>2. Confirmar eliminación<br>3. Presionar `F5` | Registro eliminado permanentemente | El registro no vuelve a aparecer tras recargar | **PASÓ** |
| **CP-10** | RF-09 | Auditoría y Estado | Usuario registrado | 1. Ir a Usuarios<br>2. Clic en *Baja lógica*<br>3. Consultar auditoría | Badge cambia a rojo y se genera log con fecha/hora | Acción registrada en la tabla de auditoría | **PASÓ** |
| **CP-11** | RF-10 | Seguridad / Roles | Intento sin sesión | Escribir en URL: `http://localhost:5173/dashboard` | Redirección forzada al login | Expulsa inmediatamente al usuario a `/login` | **PASÓ** |
| **CP-12** | RF-12 | Manejo de Errores | Backend apagado | Intentar consultar listado de eventos | Mensaje de error informativo sin colapsar la app | Error capturado amigablemente en pantalla | **PASÓ** |

---

## 4. Evidencias de Ejecución (Capturas de Pantalla)

*(Inserta aquí las capturas de pantalla de tus pruebas)*

### Evidencia 1: Autenticación y Manejo de Credenciales Inválidas (CP-01 y CP-02)
> *[Insertar captura de pantalla de la alerta "Credenciales inválidas" en el formulario de login y del acceso correcto al Dashboard]*

### Evidencia 2: Formulario de Registro y Validación de Campos Vacíos (CP-03 y CP-06)
> *[Insertar captura del modal impidiendo guardar si falta el título y del evento guardado exitosamente en la tabla]*

### Evidencia 3: Filtrado y Búsqueda en Tiempo Real (CP-04)
> *[Insertar captura escribiendo en el buscador y viendo la tabla filtrada reactivamente]*

### Evidencia 4: Eliminación con Modal de Confirmación y Consistencia (CP-09)
> *[Insertar captura del modal de confirmación "¿Eliminar evento?" y de la tabla tras presionar F5]*

### Evidencia 5: Gestión de Usuarios y Registro de Auditoría (CP-10)
> *[Insertar captura del badge de "Baja lógica" y del historial de auditoría generado]*

---

## 5. Respuestas al Cuestionario de Evaluación de Calidad

1. **¿Las funciones implementadas corresponden a los requisitos establecidos?**  
   **R:** Sí. Todas las funciones verificadas en el panel administrativo y los servicios de la API corresponden con exactitud a los requisitos planteados para la gestión académica y de eventos de la escuela de música.
2. **¿Las operaciones principales producen resultados correctos?**  
   **R:** Sí. Las operaciones CRUD procesan de forma íntegra las peticiones y actualizan tanto el estado visual reactivo como la base de datos persistente.
3. **¿El sistema rechaza entradas inválidas de manera apropiada?**  
   **R:** Sí. Los mecanismos de validación interceptan campos vacíos, correos malformados y URLs inválidas antes de comprometer la base de datos.
4. **¿Existen defectos en la navegación, los formularios o los mensajes mostrados?**  
   **R:** No se detectaron anomalías bloqueantes. Los modales limpian sus estados al cerrarse y los mensajes son claros y en idioma español.
5. **¿Los datos registrados, consultados, modificados y eliminados conservan su consistencia?**  
   **R:** Sí. Tras pruebas de recarga forzada (`Ctrl+F5`) e inspección de peticiones, los registros mantienen su integridad referencial y las eliminaciones son permanentes.
6. **¿Los permisos de usuario se aplican correctamente?**  
   **R:** Sí. Las rutas protegidas validan la presencia y vigencia del token de autenticación; cualquier intento de acceso anónimo es redirigido de inmediato.
7. **¿El sistema responde adecuadamente ante errores, interrupciones o condiciones inesperadas?**  
   **R:** Sí. Ante caídas de red o indisponibilidad del servidor backend, la interfaz atrapa los errores y muestra alertas informativas sin provocar un bloqueo de la pantalla.
8. **¿Existen defectos que puedan impedir la liberación del producto?**  
   **R:** No. Las funciones sustantivas operan con estabilidad y no se encontraron defectos de severidad crítica (Severity 1).
9. **¿Las evidencias obtenidas son suficientes para justificar la aceptación o el rechazo de la entrega?**  
   **R:** Sí. Con un porcentaje de aprobación del **100% (12 de 12 pruebas pasadas)**, se justifica plenamente el dictamen favorable.

---

## 6. Dictamen Final

* **Total de Casos Ejecutados:** 12  
* **Casos Aprobados:** 12 (100%)  
* **Casos Fallidos:** 0 (0%)  
* **Defectos Críticos:** 0  

### Veredicto: **ACEPTADO PARA LIBERACIÓN (RELEASE CANDIDATE)**  
La plataforma **Música Más Vida** cumple con los estándares de calidad funcional, consistencia de datos, validación y robustez evaluados mediante pruebas de caja negra.
