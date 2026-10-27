import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:musica_masvida_mobile/features/events/providers/event_provider.dart';
import 'package:musica_masvida_mobile/features/events/services/event_service.dart';

void main() {
  group('Fase 3 - Pruebas de Integración entre Componentes Reales (Provider + Service + Red/Modelo)', () {
    // -------------------------------------------------------------------------
    // Prueba de Integración 1: Componentes Reales (EventProvider + EventService)
    // Sin dobles ni mocks en la lógica de servicio.
    // -------------------------------------------------------------------------
    test('Integración Real 1: EventProvider interactúa directamente con EventService real para sincronizar eventos', () async {
      // Instanciamos el servicio real de la aplicación
      final realService = EventService(useMock: true);
      // Conectamos el provider real al servicio real
      final provider = EventProvider(eventService: realService);

      expect(provider.status, EventStatus.initial);
      expect(provider.events, isEmpty);

      // Disparamos la sincronización entre componentes
      await provider.fetchUpcomingEvents();

      // Verificamos que la interacción entre el Provider y el Servicio funcionó:
      // 1. El estado del provider cambió a loaded
      expect(provider.status, EventStatus.loaded);
      // 2. Los datos provistos por EventService fueron recibidos íntegramente
      expect(provider.events.length, 3);
      expect(provider.events[0].title, 'Concierto de Primavera');
      expect(provider.events[0].date, '21/09/2026');
      expect(provider.events[1].title, 'Ensayo General - Coro');
      expect(provider.events[2].title, 'Masterclass de Guitarra');
      // 3. Flags de negocio coherentes
      expect(provider.hasData, isTrue);
      expect(provider.hasError, isFalse);
    });

    // -------------------------------------------------------------------------
    // Prueba de Integración 2: Flujo Completo HTTP + Deserialización + Provider
    // Verifica la integración del pipeline: Provider -> EventService -> HTTP Client -> Model Parsing
    // -------------------------------------------------------------------------
    test('Integración Real 2: Flujo HTTP exitoso con deserialización y parseo de fechas ISO a DD/MM/YYYY', () async {
      // Cliente HTTP simulando la respuesta JSON real de la API NestJS
      final mockHttpClient = MockClient((request) async {
        if (request.url.path.endsWith('/events/upcoming')) {
          final payload = jsonEncode([
            {
              'id': 'api-evt-01',
              'title': 'Festival de Cuerdas y Teclados',
              'date': '2026-11-20T00:00:00.000Z',
              'time': '18:30',
              'location': 'Auditorio de Música',
            },
            {
              'id': 'api-evt-02',
              'title': 'Taller de Iniciación Musical',
              'date': '2026-11-25T00:00:00.000Z',
              'time': '16:00',
              'location': 'Aula 102',
            }
          ]);
          return http.Response(payload, 200, headers: {'content-type': 'application/json'});
        }
        return http.Response('Not Found', 404);
      });

      // Configuramos el EventService real con useMock: false y el cliente HTTP
      final realServiceWithHttp = EventService(client: mockHttpClient, useMock: false);
      final provider = EventProvider(eventService: realServiceWithHttp);

      await provider.fetchUpcomingEvents();

      // Verificamos que el Provider procesó los modelos mapeados por el Service
      expect(provider.status, EventStatus.loaded);
      expect(provider.events.length, 2);
      expect(provider.events[0].id, 'api-evt-01');
      expect(provider.events[0].title, 'Festival de Cuerdas y Teclados');
      // Verificamos que la integración aplicó el algoritmo de formateo de fecha (ISO -> DD/MM/YYYY)
      expect(provider.events[0].date, '20/11/2026');
      expect(provider.events[1].date, '25/11/2026');
      expect(provider.hasData, isTrue);
    });

    // -------------------------------------------------------------------------
    // Prueba de Integración 3: Manejo de Error Relevante en la Integración (HTTP 500 Server Error)
    // Verifica cómo reacciona la cadena Service -> Provider ante fallo del servidor
    // -------------------------------------------------------------------------
    test('Integración Real 3: Manejo de error de integración cuando el endpoint responde HTTP 500', () async {
      // Simulamos que el backend API sufre un error interno
      final failingHttpClient = MockClient((request) async {
        return http.Response(
          jsonEncode({'statusCode': 500, 'message': 'Internal Server Error'}),
          500,
          headers: {'content-type': 'application/json'},
        );
      });

      final serviceWithError = EventService(client: failingHttpClient, useMock: false);
      final provider = EventProvider(eventService: serviceWithError);

      await provider.fetchUpcomingEvents();

      // Verificamos que el error viajó del HTTP Client al Service, y el Service lo propagó al Provider
      expect(provider.status, EventStatus.error);
      expect(provider.hasError, isTrue);
      expect(provider.hasData, isFalse);
      expect(provider.events, isEmpty);
      // El provider debe haber registrado la causa técnica del error
      expect(provider.errorMessage, contains('Error al cargar eventos. Código: 500'));
    });
  });
}
