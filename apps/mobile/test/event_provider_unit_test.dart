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

    // -------------------------------------------------------------------------
    // Caso Válido: Flujo exitoso con carga de datos
    // -------------------------------------------------------------------------
    test('Caso Válido: debe transicionar a loaded y poblar la lista de eventos cuando el servicio responde exitosamente', () async {
      // Configuración de datos de prueba
      mockService.responseData = [
        const UpcomingEvent(
          id: '101',
          title: 'Concierto de Gala',
          date: '15/12/2026',
          time: '20:00',
          location: 'Teatro Metropolitan',
        ),
        const UpcomingEvent(
          id: '102',
          title: 'Recital de Piano',
          date: '18/12/2026',
          time: '18:30',
          location: 'Sala Silvestre Revueltas',
        ),
      ];

      // Verificación de estado inicial
      expect(provider.status, EventStatus.initial);
      expect(provider.isLoading, isFalse);
      expect(provider.hasData, isFalse);
      expect(provider.hasError, isFalse);

      // Ejecución de la lógica de negocio
      final futureFetch = provider.fetchUpcomingEvents();

      // Estado durante la carga (asíncrono)
      expect(provider.status, EventStatus.loading);
      expect(provider.isLoading, isTrue);

      await futureFetch;

      // Verificación de resultado final esperado
      expect(provider.status, EventStatus.loaded);
      expect(provider.isLoading, isFalse);
      expect(provider.hasData, isTrue);
      expect(provider.hasError, isFalse);
      expect(provider.events.length, 2);
      expect(provider.events.first.title, 'Concierto de Gala');
      expect(mockService.callCount, 1);
    });

    // -------------------------------------------------------------------------
    // Caso Límite: Lista vacía de eventos (0 registros)
    // -------------------------------------------------------------------------
    test('Caso Límite: debe manejar correctamente una lista vacía de eventos sin fallar ni marcar hasData', () async {
      // El servicio responde con 0 elementos
      mockService.responseData = [];

      await provider.fetchUpcomingEvents();

      // Verificación de comportamiento en frontera/límite
      expect(provider.status, EventStatus.loaded);
      expect(provider.events, isEmpty);
      // hasData debe ser false porque aunque el estado es loaded, la lista no tiene elementos
      expect(provider.hasData, isFalse);
      expect(provider.hasError, isFalse);
      expect(provider.errorMessage, isEmpty);
      expect(mockService.callCount, 1);
    });

    // -------------------------------------------------------------------------
    // Caso Inválido o de Error: Excepción de red / conexión rechazada
    // -------------------------------------------------------------------------
    test('Caso de Error: debe capturar excepción de conexión y transformar el mensaje a formato amigable', () async {
      // Simulación de fallo de conexión de red externa
      mockService.exceptionToThrow = Exception('SocketException: Connection refused (OS Error: Connection refused, errno = 111)');

      await provider.fetchUpcomingEvents();

      // Verificación del manejo robusto de error
      expect(provider.status, EventStatus.error);
      expect(provider.hasError, isTrue);
      expect(provider.hasData, isFalse);
      expect(provider.events, isEmpty);
      expect(
        provider.errorMessage,
        'No se pudo conectar al servidor.\nVerifica que la API esté corriendo.',
      );
      expect(mockService.callCount, 1);
    });

    // -------------------------------------------------------------------------
    // Prueba adicional: Acción de Refresh
    // -------------------------------------------------------------------------
    test('Acción Refresh: debe vaciar la lista previa y recargar los datos', () async {
      mockService.responseData = [
        const UpcomingEvent(id: '1', title: 'Evento 1', date: '01/01/2026', time: '10:00', location: 'L1'),
      ];
      await provider.fetchUpcomingEvents();
      expect(provider.events.length, 1);

      // Ahora configuramos 2 eventos y ejecutamos refresh
      mockService.responseData = [
        const UpcomingEvent(id: '1', title: 'Evento 1', date: '01/01/2026', time: '10:00', location: 'L1'),
        const UpcomingEvent(id: '2', title: 'Evento 2', date: '02/01/2026', time: '11:00', location: 'L2'),
      ];

      await provider.refresh();

      expect(provider.status, EventStatus.loaded);
      expect(provider.events.length, 2);
      expect(mockService.callCount, 2);
    });
  });
}
