import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:musica_masvida_mobile/features/auth/services/mobile_auth_service.dart';
import 'package:musica_masvida_mobile/features/events/models/upcoming_event.dart';
import 'package:musica_masvida_mobile/features/events/providers/event_provider.dart';
import 'package:musica_masvida_mobile/features/events/services/event_service.dart';

/// Práctica 11 - White Box móvil: valores límite, excepciones y condiciones.
/// Complementa a los tests existentes cubriendo ramas de error no ejercitadas.

class _FakeEventService extends EventService {
  _FakeEventService(this.handler);

  final Future<List<UpcomingEvent>> Function() handler;

  @override
  Future<List<UpcomingEvent>> getUpcomingEvents({bool forceRefresh = false}) =>
      handler();
}

const _eventJson = {
  'id': '1',
  'title': 'Concierto',
  'date': '2026-12-20T00:00:00.000Z',
  'time': '18:00',
  'location': 'Auditorio',
};

void main() {
  group('EventService - manejo de excepciones y códigos', () {
    test('useMock evita cualquier llamada HTTP y devuelve 3 eventos', () async {
      final client = MockClient(
        (_) async => throw StateError('no debe llamarse'),
      );
      final service = EventService(client: client, useMock: true);

      final events = await service.getUpcomingEvents();

      expect(events, hasLength(3));
    });

    test('200 con JSON válido mapea la lista', () async {
      final client = MockClient(
        (_) async => http.Response(
          jsonEncode([_eventJson]),
          200,
          headers: {'content-type': 'application/json'},
        ),
      );
      final service = EventService(client: client);

      final events = await service.getUpcomingEvents();

      expect(events.single.title, 'Concierto');
      expect(events.single.date, '20/12/2026');
    });

    test('código 500 lanza Exception con el código HTTP', () async {
      final client = MockClient((_) async => http.Response('error', 500));
      final service = EventService(client: client);

      await expectLater(
        service.getUpcomingEvents(),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'mensaje',
            contains('Código: 500'),
          ),
        ),
      );
    });

    test(
      '200 con cuerpo no JSON propaga FormatException (rama no controlada)',
      () async {
        final client = MockClient(
          (_) async => http.Response('<html>error</html>', 200),
        );
        final service = EventService(client: client);

        await expectLater(
          service.getUpcomingEvents(),
          throwsA(isA<FormatException>()),
        );
      },
    );

    test('timeout de red propaga TimeoutException', () async {
      final client = MockClient((_) async => throw TimeoutException('sin red'));
      final service = EventService(client: client);

      await expectLater(
        service.getUpcomingEvents(),
        throwsA(isA<TimeoutException>()),
      );
    });

    test('isRegistered devuelve true/false según el cuerpo', () async {
      final serviceTrue = EventService(
        client: MockClient(
          (_) async => http.Response(jsonEncode({'registered': true}), 200),
        ),
      );
      final serviceFalse = EventService(
        client: MockClient(
          (_) async => http.Response(jsonEncode({'registered': false}), 200),
        ),
      );

      expect(await serviceTrue.isRegistered('e1', 't'), isTrue);
      expect(await serviceFalse.isRegistered('e1', 't'), isFalse);
    });

    test('isRegistered acepta mensaje de error en formato lista', () async {
      final client = MockClient(
        (_) async => http.Response(
          jsonEncode({
            'message': ['primero', 'segundo'],
          }),
          401,
          headers: {'content-type': 'application/json'},
        ),
      );
      final service = EventService(client: client);

      await expectLater(
        service.isRegistered('e1', 't'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'mensaje',
            allOf(contains('primero'), contains('segundo')),
          ),
        ),
      );
    });

    test('isRegistered con error no JSON informa el código HTTP', () async {
      final client = MockClient((_) async => http.Response('nope', 503));
      final service = EventService(client: client);

      await expectLater(
        service.isRegistered('e1', 't'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'mensaje',
            contains('Error HTTP 503'),
          ),
        ),
      );
    });

    test(
      'isRegistered con tipo inesperado en registered lanza FormatException',
      () async {
        final client = MockClient(
          (_) async => http.Response(jsonEncode({'registered': 'si'}), 200),
        );
        final service = EventService(client: client);

        await expectLater(
          service.isRegistered('e1', 't'),
          throwsA(isA<FormatException>()),
        );
      },
    );

    test('registerForEvent acepta 201 sin cuerpo', () async {
      final client = MockClient((_) async => http.Response('', 201));
      final service = EventService(client: client);

      await expectLater(service.registerForEvent('e1', 't'), completes);
    });

    test(
      'registerForEvent traduce 409 a Exception con el mensaje del backend',
      () async {
        final client = MockClient(
          (_) async => http.Response(
            jsonEncode({'message': 'Ya estás inscrito en este evento'}),
            409,
            headers: {'content-type': 'application/json'},
          ),
        );
        final service = EventService(client: client);

        await expectLater(
          service.registerForEvent('e1', 't'),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'mensaje',
              contains('Ya estás inscrito'),
            ),
          ),
        );
      },
    );
  });

  group('EventProvider - estados y clasificación de errores', () {
    test('carga exitosa cambia a loaded y notifica', () async {
      final service = _FakeEventService(
        () async => [UpcomingEvent.fromJson(_eventJson)],
      );
      final provider = EventProvider(eventService: service);
      var notifications = 0;
      provider.addListener(() => notifications++);

      await provider.fetchUpcomingEvents();

      expect(provider.status, EventStatus.loaded);
      expect(provider.hasData, isTrue);
      expect(provider.events, hasLength(1));
      expect(notifications, 2); // loading + loaded
    });

    test('SocketException se muestra como error de conexión', () async {
      final service = _FakeEventService(
        () async => throw Exception('SocketException: Failed host lookup'),
      );
      final provider = EventProvider(eventService: service);

      await provider.fetchUpcomingEvents();

      expect(provider.status, EventStatus.error);
      expect(provider.errorMessage, contains('No se pudo conectar'));
    });

    test('TimeoutException se muestra como tiempo de espera', () async {
      final service = _FakeEventService(
        () async => throw TimeoutException('tarde'),
      );
      final provider = EventProvider(eventService: service);

      await provider.fetchUpcomingEvents();

      expect(provider.errorMessage, contains('tardó demasiado'));
    });

    test('error genérico conserva el detalle', () async {
      final service = _FakeEventService(() async => throw Exception('boom'));
      final provider = EventProvider(eventService: service);

      await provider.fetchUpcomingEvents();

      expect(provider.errorMessage, contains('error inesperado'));
      expect(provider.errorMessage, contains('boom'));
    });

    test('una segunda llamada durante loading se ignora', () async {
      final completer = Completer<List<UpcomingEvent>>();
      final service = _FakeEventService(() => completer.future);
      final provider = EventProvider(eventService: service);

      final first = provider.fetchUpcomingEvents();
      await provider.fetchUpcomingEvents(); // debe retornar de inmediato
      expect(provider.status, EventStatus.loading);

      completer.complete([UpcomingEvent.fromJson(_eventJson)]);
      await first;
      expect(provider.status, EventStatus.loaded);
    });

    test('refresh limpia los eventos antes de recargar', () async {
      var calls = 0;
      final service = _FakeEventService(() async {
        calls++;
        if (calls == 1) return [UpcomingEvent.fromJson(_eventJson)];
        throw Exception('sin red');
      });
      final provider = EventProvider(eventService: service);

      await provider.fetchUpcomingEvents();
      expect(provider.events, hasLength(1));

      await provider.refresh();
      expect(provider.events, isEmpty);
      expect(provider.status, EventStatus.error);
    });
  });

  group('UpcomingEvent - valores límite', () {
    test('JSON vacío usa valores por defecto', () {
      final event = UpcomingEvent.fromJson({});
      expect(event.id, '');
      expect(event.title, 'Sin título');
      expect(event.date, '');
      expect(event.capacity, 50);
      expect(event.description, '');
    });

    test('fecha inválida se conserva sin lanzar excepción', () {
      final event = UpcomingEvent.fromJson({
        ..._eventJson,
        'date': '32/13/2026',
      });
      expect(event.date, '32/13/2026');
    });

    test('capacity decimal se trunca a entero', () {
      final event = UpcomingEvent.fromJson({..._eventJson, 'capacity': 30.9});
      expect(event.capacity, 30);
    });

    test('título con tipo numérico lanza TypeError (entrada no validada)', () {
      expect(
        () => UpcomingEvent.fromJson({..._eventJson, 'title': 123}),
        throwsA(isA<TypeError>()),
      );
    });

    test('date con tipo numérico lanza TypeError (entrada no validada)', () {
      expect(
        () => UpcomingEvent.fromJson({..._eventJson, 'date': 20261220}),
        throwsA(isA<TypeError>()),
      );
    });

    test('toJson conserva todos los campos', () {
      final event = UpcomingEvent.fromJson({..._eventJson, 'capacity': 10});
      expect(event.toJson()['capacity'], 10);
      expect(event.toJson()['date'], '20/12/2026');
    });
  });

  group('MobileAuthService - excepciones y validación de token', () {
    test(
      'respuesta 502 con HTML informa el código sin fallar al parsear JSON',
      () async {
        final client = MockClient(
          (_) async => http.Response('<html>Bad Gateway</html>', 502),
        );
        final service = MobileAuthService(client: client);

        await expectLater(
          service.loginWithQr('code'),
          throwsA(
            isA<Exception>().having(
              (error) => error.toString(),
              'mensaje',
              contains('HTTP 502'),
            ),
          ),
        );
      },
    );

    test('200 sin accessToken lanza Exception controlada', () async {
      final client = MockClient(
        (_) async => http.Response(jsonEncode({'ok': true}), 200),
      );
      final service = MobileAuthService(client: client);

      await expectLater(
        service.loginWithQr('code'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'mensaje',
            contains('no contiene un token'),
          ),
        ),
      );
    });

    test('401 con message lista conserva los detalles del servidor', () async {
      final client = MockClient(
        (_) async => http.Response(
          jsonEncode({
            'message': ['a', 'b'],
          }),
          401,
        ),
      );
      final service = MobileAuthService(client: client);

      await expectLater(
        service.loginWithQr('code'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'mensaje',
            allOf(contains('a'), contains('b')),
          ),
        ),
      );
    });

    test('401 con message string expone el mensaje del backend', () async {
      final client = MockClient(
        (_) async =>
            http.Response(jsonEncode({'message': 'El código QR expiró'}), 401),
      );
      final service = MobileAuthService(client: client);

      await expectLater(
        service.loginWithQr('code'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'mensaje',
            contains('El código QR expiró'),
          ),
        ),
      );
    });
  });
}
