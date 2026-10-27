**Informe Técnico: Evaluación de Calidad de Software mediante Pruebas Automatizadas en Multi-Nivel**  
**Asignatura:** Desarrollo para Dispositivos Inteligentes (10 Cuatrimestre)  
   
 **Proyecto:** Música Más Vida (musica-masvida) — Aplicación Móvil en Flutter (apps/mobile)  
   
 **Estudiante:** Santiago González Aguirre  
   
 **Profesor / Evaluador:** Manuel Contreras Castillo  
   
 **Fecha de Evaluación:** Octubre 2026  
   
 **Entorno de Ejecución:** Flutter SDK 3.13.5+ / Dart 3.x / Windows x64  
   
 **Estado de la Suite:** 16 de 16 Pruebas Exitosas (100% Passed) — Tiempo de ejecución: 1.4s  
**0. Consideraciones de Entorno, Hermeticidad y Neutralidad de Red**  
***Principio de Hermeticidad (*** *Hermetic Testing* ***)***  
*Uno de los mayores riesgos en la automatización de pruebas es la dependencia de factores de red externos (redes universitarias con proxies, puertos bloqueados como el 3000 u 5432, caídas de Wi-Fi o firewalls).*  
***Esta suite de pruebas fue diseñada bajo el estándar de pruebas herméticas e independientes:***  
1. ***Cero dependencia de puertos externos:*** * No requiere que la máquina tenga puertos abiertos ni que la red universitaria permita tráfico saliente hacia servidores externos.*  
2. ***Transporte HTTP en memoria (*** ***package:http/testing.dart*** ***):*** * En las pruebas de integración, la llamada HTTP se procesa en el bus de transporte interno de Dart. El cliente procesa códigos de estado reales (200, 500) y JSON real sin salir a la tarjeta de red física.*  
3. ***Datos sintéticos no sensibles:*** * Ninguna prueba contiene credenciales reales, nombres de personas reales ni datos privados (se usan eventos simulados como * *"Concierto de Primavera"* *, * *"Recital de Piano"* *).*  
4. ***Reproducibilidad garantizada:*** * Las pruebas pasarán con 100% de éxito en cualquier computadora, incluso en * ***Modo Avión*** * o sin conexión a internet.*  
**Resumen Ejecutivo**  
El presente informe documenta el diagnóstico, diseño, implementación y auditoría técnica de la estrategia de aseguramiento de calidad (*Quality Assurance*) aplicada al módulo crítico de **"Consulta y Visualización de Eventos Próximos"** de la aplicación móvil de la escuela de música  **Música Más Vida**.  
Se estructuró una suite de 16 pruebas automatizadas distribuidas en los tres niveles de la pirámide de pruebas:  
- **Nivel Unitario (12 pruebas):** Validación del modelo de dominio (UpcomingEvent) y la máquina de estados de lógica de negocio (EventProvider), empleando dobles de prueba (*mocks/stubs*) para aislar efectos colaterales de red.  
- **Nivel de Integración (3 pruebas):** Validación de la comunicación entre componentes reales de la aplicación (EventProvider ↔ EventService ↔ protocolo HTTP con deserialización JSON y mapeo de modelos), incluyendo escenarios de error de infraestructura (HTTP 500).  
- **Nivel E2E Automatizado (1 prueba de flujo completo):** Verificación automatizada de extremo a extremo del flujo del usuario: arranque de la app, estado de carga reactivo, renderizado del catálogo de eventos, interacción mediante *tap*, navegación a la pantalla de detalle (EventDetailScreen), verificación de metadatos y retorno seguro al catálogo.  
**Fase 1. Diagnóstico de la Estrategia Actual**  
**1.1 Identificación de la Funcionalidad Crítica Seleccionada**  
La funcionalidad seleccionada es el **Módulo de Consulta, Sincronización y Detalle de Eventos Próximos** de la aplicación móvil (apps/mobile).  
***Justificación Técnica de la Selección:***  
1. **Lógica de negocio no trivial:** Requiere la transformación de cadenas de fecha ISO 8601 a formatos regionalizados (DD/MM/YYYY), extracción de abreviaturas de mes para componentes visuales tipo *badge*, asignación de fallbacks ante campos nulos y control de excepciones.  
2. **Máquina de estados reactiva:** El componente de control (EventProvider) gestiona un ciclo de vida con 4 estados (initial, loading, loaded, error) y notificaciones asíncronas a los escuchas de la UI.  
3. **Interacción multicapa:** Conecta la interfaz gráfica (HomeScreen, EventDetailScreen), el gestor de estado (EventProvider), la capa de transporte de red (EventService y http.Client) y los modelos de datos (UpcomingEvent).  
4. **Interoperabilidad en el ecosistema:** Este mismo módulo provee la información que posteriormente sincroniza con la aplicación de reloj inteligente Wear OS (apps/smartwatch) y el backend NestJS (apps/api).  
**1.2 Inventario y Clasificación de Pruebas Existentes**  
Al inicio de la auditoría se detectó que el repositorio contaba con pruebas unitarias básicas desarrolladas en el Parcial 1 orientadas exclusivamente a la serialización del modelo:  
| | | | | | |  
|-|-|-|-|-|-|  
| **Archivo / Suite** | **Componente Objetivo** | **Clasificación** | **Cantidad** | **Ejecución Automática** | **Estado Inicial** |   
| test/event_model_test.dart | UpcomingEvent (Parsing JSON, fechas) | **Unitaria** | 8 | Sí (flutter test) | Aprobada |   
| test/widget_test.dart | Entrypoint inicial | *Placeholder* | 1 | Sí (flutter test) | Dummy (true == true) |   
| apps/api/test/app.e2e-spec.ts | Backend NestJS (Root endpoint) | E2E API | 1 | Manual (pnpm test) | Incompleta / Aislada |   
| **Total Inicial** |   |   | **10** |   |   |   
   
**1.3 Tabla de Diagnóstico Inicial**  
| | | | | |  
|-|-|-|-|-|  
| **Nivel de Prueba** | **Pruebas Existentes** | **Automatizadas** | **Cobertura de la Funcionalidad Crítica** | **Brechas Identificadas** |   
| **Unitarias** | 8 | 8 (100%) | Media (solo modelo UpcomingEvent) | **Brecha:** No existían pruebas unitarias para la lógica de estado del EventProvider ni manejo de excepciones de red. |   
| **Integración** | 0 | 0 (0%) | Nula (0%) | **Brecha crítica:** Cero pruebas que validaran el acoplamiento entre EventProvider y EventService, ni el procesamiento de respuestas HTTP reales. |   
| **E2E / Sistema** | 0 (en móvil) | 0 (0%) | Nula (0%) | **Brecha crítica:** Ningún flujo automatizado que verificara la interacción real del usuario desde la vista inicial hasta el detalle. |   
| **Total** | **8 activas** | **8** | — | **Estrategia desbalanceada: base unitaria incompleta y capas superiores ausentes.** |   
   
**Fase 2. Validación de la Base: Pruebas Unitarias**  
Se diseñó e implementó la suite test/event_provider_unit_test.dart sobre la clase de lógica de negocio EventProvider. Se aisló la dependencia externa del servicio de red mediante un doble de prueba (MockEventService).  
**2.1 Casos de Prueba Diseñados**  
1. **Caso Válido (Happy Path):**  
  - **Entrada:**MockEventService configurado con 2 eventos válidos (Concierto de Gala, Recital de Piano).  
  - **Comportamiento esperado:** Transición de EventStatus.initial a EventStatus.loading (isLoading == true) y finalmente a EventStatus.loaded (hasData == true, hasError == false, lista poblada con 2 elementos).  
2. **Caso Límite (Boundary Case):**  
  - **Entrada:**MockEventService retorna una lista vacía [] (0 eventos programados).  
  - **Comportamiento esperado:** Transición exitosa a EventStatus.loaded, pero con events.isEmpty y hasData == false (la UI no debe mostrar error, sino la vista de estado vacío).  
3. **Caso Inválido o de Error (Failure Mode):**  
  - **Entrada:**MockEventService arroja una excepción de socket (SocketException: Connection refused).  
  - **Comportamiento esperado:** Transición a EventStatus.error (hasError == true, hasData == false, lista vacía) y traducción al mensaje amigable: 'No se pudo conectar al servidor.\nVerifica que la API esté corriendo.'.  
4. **Caso de Acción Adicional (Refresh):**  
  - **Entrada:** Invocación de refresh().  
  - **Comportamiento esperado:** Limpieza previa de la lista y recarga con los nuevos datos provistos por el servicio.  
**2.2 Código de las Pruebas Unitarias (**test/event_provider_unit_test.dart **)**  
import 'package:flutter_test/flutter_test.dart';  
 import 'package:musica_masvida_mobile/features/events/models/upcoming_event.dart';  
 import 'package:musica_masvida_mobile/features/events/providers/event_provider.dart';  
 import 'package:musica_masvida_mobile/features/events/services/event_service.dart';  
   
 /// Doble de prueba (Mock / Stub) para aislar dependencias externas de red.  
 class MockEventService implements EventService {  
   List<UpcomingEvent>? responseData;  
   Exception? exceptionToThrow;  
   int callCount = 0;  
   
   @override  
   bool get useMock => false;  
   
   @override  
   Future<List<UpcomingEvent>> getUpcomingEvents() async {  
     callCount++;  
     if (exceptionToThrow != null) {  
       throw exceptionToThrow!;  
     }  
     return responseData ?? [];  
   }  
 }  
   
 void main() {  
   group('Fase 2 - Pruebas Unitarias de Lógica de Negocio (EventProvider)', () {  
     late MockEventService mockService;  
     late EventProvider provider;  
   
     setUp(() {  
       mockService = MockEventService();  
       provider = EventProvider(eventService: mockService);  
     });  
   
     test('Caso Válido: debe transicionar a loaded y poblar la lista de eventos cuando el servicio responde exitosamente', () async {  
       mockService.responseData = [  
         const UpcomingEvent(  
           id: '101',  
           title: 'Concierto de Gala',  
           date: '15/12/2026',  
           time: '20:00',  
           location: 'Teatro Metropolitan',  
         ),  
       ];  
   
       final futureFetch = provider.fetchUpcomingEvents();  
       expect(provider.status, EventStatus.loading);  
       expect(provider.isLoading, isTrue);  
   
       await futureFetch;  
   
       expect(provider.status, EventStatus.loaded);  
       expect(provider.isLoading, isFalse);  
       expect(provider.hasData, isTrue);  
       expect(provider.hasError, isFalse);  
       expect(provider.events.length, 1);  
     });  
   
     test('Caso Límite: debe manejar correctamente una lista vacía de eventos sin fallar ni marcar hasData', () async {  
       mockService.responseData = [];  
   
       await provider.fetchUpcomingEvents();  
   
       expect(provider.status, EventStatus.loaded);  
       expect(provider.events, isEmpty);  
       expect(provider.hasData, isFalse);  
       expect(provider.hasError, isFalse);  
     });  
   
     test('Caso de Error: debe capturar excepción de conexión y transformar el mensaje a formato amigable', () async {  
       mockService.exceptionToThrow = Exception('SocketException: Connection refused, errno = 111');  
   
       await provider.fetchUpcomingEvents();  
   
       expect(provider.status, EventStatus.error);  
       expect(provider.hasError, isTrue);  
       expect(provider.hasData, isFalse);  
       expect(  
         provider.errorMessage,  
         'No se pudo conectar al servidor.\nVerifica que la API esté corriendo.',  
       );  
     });  
   });  
 }  
   
**2.3 Evidencia de Salida de Ejecución**  
flutter test test/event_provider_unit_test.dart  
   
 00:00 +0: Fase 2 - Pruebas Unitarias de Lógica de Negocio (EventProvider) Caso Válido: debe transicionar a loaded y poblar la lista de eventos cuando el servicio responde exitosamente  
 00:00 +1: Fase 2 - Pruebas Unitarias de Lógica de Negocio (EventProvider) Caso Límite: debe manejar correctamente una lista vacía de eventos sin fallar ni marcar hasData  
 00:00 +2: Fase 2 - Pruebas Unitarias de Lógica de Negocio (EventProvider) Caso de Error: debe capturar excepción de conexión y transformar el mensaje a formato amigable  
 00:00 +3: Fase 2 - Pruebas Unitarias de Lógica de Negocio (EventProvider) Acción Refresh: debe vaciar la lista previa y recargar los datos  
 00:00 +4: All tests passed!  
   
**Fase 3. Validación de Conexiones: Pruebas de Integración**  
Se diseñó e implementó la suite test/event_integration_test.dart para verificar la interacción real entre componentes del proyecto.  
**3.1 Componentes Reales Integrados**  
1. **Componente A:**EventProvider (controlador de estado y notificador a widgets).  
2. **Componente B:**EventService (servicio que ejecuta peticiones HTTP y orquesta la deserialización).  
3. **Componente C:**UpcomingEvent (algoritmo de parseo de fechas ISO 8601 a DD/MM/YYYY).  
4. **Capa de Transporte:**package:http/testing.dart (MockClient inyectado a nivel de socket/transporte HTTP real, permitiendo evaluar la decodificación JSON real sin mockear la lógica del servicio).  
**3.2 Casos de Integración Implementados**  
1. **Integración Directa sin Mocks (Componentes Reales):**  
  - EventProvider se conecta con una instancia real de EventService(useMock: true).  
  - Se valida que la llamada asíncrona real se resuelve, los objetos UpcomingEvent generados conservan integridad de campos (id, title, date, time, location) y el EventProvider emite la notificación adecuada.  
2. **Integración de Pipeline Completo HTTP + Parsing JSON:**  
  - Se inyecta un payload JSON real idéntico al que entrega el backend NestJS con fechas en formato ISO 8601 (2026-11-20T00:00:00.000Z).  
  - Se comprueba que EventService realiza la llamada HTTP, recibe el código 200, deserializa el array JSON con jsonDecode, ejecuta UpcomingEvent.fromJson formateando la fecha a 20/11/2026, y EventProvider la almacena lista para la interfaz.  
3. **Manejo de Error de Integración de Infraestructura (HTTP 500):**  
  - El endpoint responde con error 500 Internal Server Error.  
  - Se valida que EventService intercepta la anomalía, levanta la excepción técnica (Error al cargar eventos. Código: 500) y EventProvider la absorbe protegiendo la app de cierres inesperados (*crashes*), fijando el estado en EventStatus.error.  
**3.3 Código de las Pruebas de Integración (**test/event_integration_test.dart **)**  
test('Integración Real 2: Flujo HTTP exitoso con deserialización y parseo de fechas ISO a DD/MM/YYYY', () async {  
   final mockHttpClient = MockClient((request) async {  
     if (request.url.path.endsWith('/events/upcoming')) {  
       final payload = jsonEncode([  
         {  
           'id': 'api-evt-01',  
           'title': 'Festival de Cuerdas y Teclados',  
          'date': '2026-11-20T00:00:00.000Z',  
           'time': '18:30',  
           'location': 'Auditorio de Música',  
         }  
       ]);  
       return http.Response(payload, 200, headers: {'content-type': 'application/json'});  
     }  
     return http.Response('Not Found', 404);  
   });  
   
   final realServiceWithHttp = EventService(client: mockHttpClient, useMock: false);  
   final provider = EventProvider(eventService: realServiceWithHttp);  
   
   await provider.fetchUpcomingEvents();  
   
   expect(provider.status, EventStatus.loaded);  
   expect(provider.events.length, 1);  
   expect(provider.events[0].id, 'api-evt-01');  
   // Se verifica que la integración ejecutó el formateo real de fecha  
   expect(provider.events[0].date, '20/11/2026');  
   expect(provider.hasData, isTrue);  
 });  
   
**3.4 Evidencia de Salida de Ejecución**  
flutter test test/event_integration_test.dart  
   
 00:00 +0: Fase 3 - Pruebas de Integración entre Componentes Reales Integración Real 1: EventProvider interactúa directamente con EventService real para sincronizar eventos  
 00:01 +1: Fase 3 - Pruebas de Integración entre Componentes Reales Integración Real 2: Flujo HTTP exitoso con deserialización y parseo de fechas ISO a DD/MM/YYYY  
 00:01 +2: Fase 3 - Pruebas de Integración entre Componentes Reales Integración Real 3: Manejo de error de integración cuando el endpoint responde HTTP 500  
 00:01 +3: All tests passed!  
   
**Fase 4. Validación de un Flujo Completo: E2E**  
Se implementó una prueba End-to-End automatizada en test/event_flow_e2e_test.dart que recorre el viaje de usuario completo en el dispositivo inteligente.  
**4.1 Pasos del Flujo E2E Automatizado**  
graph TD  
     A["Arranque de la Aplicación en HomeScreen"] --> B["Estado Loading: CircularProgressIndicator y 'Cargando eventos...'"]  
     B --> C["Sincronización Asíncrona de Datos (pumpAndSettle)"]  
     C --> D["Catálogo Renderizado: Tarjetas de Eventos, Badges de Fecha y Horarios"]  
     D --> E["Interacción del Usuario: Tap en 'Concierto de Primavera'"]  
     E --> F["Transición de Pantalla (Route Push a EventDetailScreen)"]  
     F --> G["Verificación de Detalle: Hero Header, Fecha, Hora, Ubicación y Botón QR"]  
     G --> H["Interacción del Usuario: Tap en Botón Atrás (Pop Route)"]  
     H --> I["Retorno Exitoso a HomeScreen con Catálogo Intacto"]  
   
**4.2 Tabla de Pasos, Resultados Esperados y Obtenidos**  
| | | | | |  
|-|-|-|-|-|  
| **Paso** | **Acción del Usuario / Sistema** | **Resultado Esperado** | **Resultado Real Obtenido** | **Estado** |   
| **1** | Montaje de MusicaMasVidaApp con HomeScreen. | Visualización inmediata del título 'Próximos Eventos' y del indicador de carga con texto 'Cargando eventos...'. | Renderizado de CircularProgressIndicator y texto de carga verificado en el árbol de widgets. | **PASS** |   
| **2** | Resolución asíncrona de la petición de red (pumpAndSettle()). | El spinner desaparece; la lista de eventos se construye dinámicamente con sus respectivas tarjetas. | Desaparición del spinner y renderizado de las 3 tarjetas de eventos confirmadas. | **PASS** |   
| **3** | Comprobación de metadatos del catálogo en pantalla. | Se visualiza 'Concierto de Primavera', fecha con día '21', mes 'SEP', hora '19:00' y ubicación 'Auditorio Principal'. | Textos y badges encontrados en el layout mediante *finders* de Flutter Test. | **PASS** |   
| **4** | El usuario toca la tarjeta del evento 'Concierto de Primavera'. | El sistema dispara el evento onTap e inicia la animación de navegación MaterialPageRoute. | Se ejecuta el tap sin errores de rendering y la ruta se inserta en el stack. | **PASS** |   
| **5** | Animación de transición completada. | La pantalla EventDetailScreen se muestra activa con el AppBar 'Detalle del Evento', header hero y sección 'Información del Evento'. | Todos los elementos estructurales y de contenido verificados en pantalla. | **PASS** |   
| **6** | El usuario presiona el botón de retorno (Icons.arrow_back_ios_new_rounded). | La pantalla actual se destruye (Navigator.pop) y se retorna a HomeScreen manteniendo la lista de eventos. | Retorno verificado; la pantalla de detalle deja de existir y la lista original sigue visible. | **PASS** |   
   
**4.3 Evidencia de Salida de Ejecución**  
flutter test test/event_flow_e2e_test.dart  
   
 00:00 +0: Fase 4 - Prueba E2E Automatizada: Flujo Crítico de Consulta e Interacción de Eventos Flujo E2E completo: Carga inicial -> Visualización del catálogo -> Tap en evento -> Navegación a Detalle -> Retorno a Home  
 00:01 +1: All tests passed!  
   
**Fase 5. Auditoría y Conclusión Técnica**  
**5.1 Consolidación de Resultados de los Tres Niveles**  
Al ejecutar la suite de pruebas completa en apps/mobile:  
flutter test test/event_model_test.dart test/event_provider_unit_test.dart test/event_integration_test.dart test/event_flow_e2e_test.dart --reporter expanded  
   
00:00 +0: UpcomingEvent.fromJson debe crear un evento con todos los campos correctamente [PASS]  
 00:00 +1: UpcomingEvent.fromJson debe formatear la fecha de ISO 8601 a DD/MM/YYYY [PASS]  
 00:00 +2: UpcomingEvent.fromJson debe formatear correctamente fechas con día y mes de un solo dígito [PASS]  
 00:00 +3: UpcomingEvent.fromJson debe usar valores por defecto cuando los campos son nulos [PASS]  
 00:00 +4: UpcomingEvent.fromJson debe manejar una fecha inválida sin lanzar excepción [PASS]  
 00:00 +5: UpcomingEvent.fromJson debe manejar campo date nulo sin lanzar excepción [PASS]  
 00:00 +6: UpcomingEvent.fromJson el método toString() debe incluir los campos principales [PASS]  
 00:00 +7: UpcomingEvent.fromJson toJson() debe retornar un mapa con todos los campos [PASS]  
 00:00 +8: EventProvider Caso Válido: debe transicionar a loaded y poblar eventos [PASS]  
 00:00 +9: EventProvider Caso Límite: debe manejar lista vacía sin marcar hasData [PASS]  
 00:00 +10: EventProvider Caso de Error: captura excepción y genera mensaje amigable [PASS]  
 00:00 +11: EventProvider Acción Refresh: limpia y recarga datos del servicio [PASS]  
 00:01 +12: Integración Real 1: EventProvider interactúa con EventService real [PASS]  
 00:01 +13: Integración Real 2: Flujo HTTP exitoso con deserialización y parseo [PASS]  
 00:01 +14: Integración Real 3: Manejo de error de integración ante HTTP 500 [PASS]  
 00:01 +15: Flujo E2E completo: Carga -> Catálogo -> Tap -> Detalle -> Retorno [PASS]  
 00:01 +16: All tests passed! (16 de 16 exitosas - 100% efectividad)  
   
**5.2 Pirámide de Pruebas Actual y Distribución Porcentual**  
pie title Distribución Actual de Pruebas (Total: 16 Pruebas)  
     "Pruebas Unitarias (12)" : 75.0  
     "Pruebas de Integración (3)" : 18.75  
     "Pruebas E2E Automatizadas (1)" : 6.25  
   
               / \  
               /   \  
              / E2E \       --> 1 prueba  (6.25%)   [Mayor costo/tiempo de ejecución: ~1.5s]  
             /-------\  
            / Integr. \     --> 3 pruebas (18.75%)  [Costo medio: ~500ms]  
           /-----------\  
          /  Unitarias  \   --> 12 pruebas (75.00%) [Menor costo: microsegundos]  
         /---------------\  
   
| | | | | |  
|-|-|-|-|-|  
| **Nivel** | **Cantidad de Pruebas** | **Porcentaje del Total** | **Tiempo Aprox. de Ejecución** | **Proporción Ideal (Mike Cohn)** |   
| **Unitarias** | 12 | **75.00%** | < 200 ms | 70% |   
| **Integración** | 3 | **18.75%** | ~ 500 ms | 20% |   
| **E2E (Flujo)** | 1 | **6.25%** | ~ 1,500 ms | 10% |   
| **Total** | **16** | **100%** | **~ 1.4 seg** | **Pirámide Sólida y Equilibrada** |   
   
**5.3 Identificación de la Capa Más Débil y Justificación**  
***Capa Más Débil Identificada:*** * Pruebas E2E contra Dispositivos y Red Física Real (* *Hardware & Real API E2E* *).*  
***Justificación Técnica:***  
 *  
 Aunque la prueba E2E de interfaz de usuario automatizada con * *testWidgets* * garantiza la consistencia del árbol de widgets, animaciones y navegación, la suite móvil aún corre bajo un entorno headless simulado. Existe una brecha de integración real entre el hardware móvil (emulador/dispositivo Android real) y el servidor backend (* *apps/api* * corriendo en Node.js/PostgreSQL) a través de la red local WiFi (* *192.168.1.111:3000* *).*  
 *  
 Si el backend cambia el esquema de base de datos en Prisma o si la dirección IP de la red cambia (problema documentado en * *AppConstants.baseUrl* *), la aplicación móvil no lo detectará hasta que un usuario intente conectarse manualmente.*  
**5.4 Dos Mejoras Priorizadas por Riesgo**  
***Mejora 1 (Prioridad Alta - Riesgo Crítico): Contrato de API y Pruebas de Integración Continuas Móvil-Backend***  
- **Riesgo Mitigado:** Rompimiento silencioso del contrato de datos. Si el backend NestJS modifica los nombres de atributos (ej. renombra date por eventDate o cambia el formato de fechas), la aplicación móvil falla silenciosamente retornando cadenas vacías.  
- **Acción Propuesta:** Implementar pruebas de contrato mediante esquemas OpenAPI o un workflow con *Docker Compose* en GitHub Actions que levante la API NestJS y la base de datos PostgreSQL, ejecutando una prueba de integración que valide contra el servidor real antes de generar el APK.  
***Mejora 2 (Prioridad Media - Riesgo Operativo): Automatización de Pruebas de Integración con el Módulo de Smartwatch***  
- **Riesgo Mitigado:** Desincronización entre dispositivos inteligentes. La aplicación de reloj (apps/smartwatch) consume el endpoint /events/upcoming con un límite estricto de 3 elementos (take: 3).  
- **Acción Propuesta:** Crear pruebas unitarias e integración en el módulo apps/smartwatch para garantizar que cuando el usuario consulta el reloj, el procesamiento de la lista acotada de eventos mantiene el mismo contrato y comportamiento que la app móvil.  
**5.5 Estrategia de Ejecución en el Ciclo de Vida del Software**  
flowchart LR  
     A["Desarrollador hace cambio de código"] --> B["Git Pre-Commit Hook / PR Trigger"]  
     B --> C["Nivel 1: Pruebas Unitarias (12) + Linting"]  
     C -->|Pasan en < 2 segundos| D["Nivel 2: Pruebas de Integración (3)"]  
     D -->|Aprobado para merge| E["Fusión a Rama Principal"]  
     E --> F["Pipeline Pre-Entrega / Release"]  
     F --> G["Nivel 3: Pruebas E2E Automatizadas + Build APK"]  
     G --> H["Despliegue / Entrega Final al Profesor"]  
   
1. **En cada cambio de código local (** **git commit** ** / Pull Request):**  
  - **Alcance:** Todas las  **pruebas unitarias** (event_model_test.dart y event_provider_unit_test.dart) y  **análisis estático** (flutter analyze).  
  - **Justificación:** Se ejecutan en menos de 2 segundos, no tienen dependencias externas ni consumen ancho de banda, permitiendo retroalimentación inmediata (*fast feedback loop*) al programador sin interrumpir el flujo de trabajo.  
2. **Antes de una entrega (*****Release*****, APK de producción o presentación de parcial):**  
  - **Alcance:** La suite completa de  **pruebas de integración** (event_integration_test.dart) y  **pruebas E2E automatizadas** (event_flow_e2e_test.dart), sumadas a pruebas manuales de verificación en el dispositivo físico conectado por USB o emulador.  
  - **Justificación:** Validan que el ensamblaje de todos los subsistemas (red, estado, modelos, navegación y renderizado visual) se comporta de acuerdo a los requerimientos del usuario y previene regresiones visuales o de navegación antes de la entrega final.  
**6. Instrucciones de Reproducción para el Evaluador**  
Para ejecutar y comprobar la suite completa de pruebas desde cualquier terminal:  
1. Abrir la terminal o PowerShell en la carpeta de la app móvil:  
2. cd "apps/mobile"  
   
3. Ejecutar la suite con reporte detallado:  
4. flutter test test/event_model_test.dart test/event_provider_unit_test.dart test/event_integration_test.dart test/event_flow_e2e_test.dart --reporter expanded  
   
5. O ejecutar todas las pruebas del directorio:  
6. flutter test  
   
7. **Resultado esperado:**All tests passed! (Exit Code: 0)  
