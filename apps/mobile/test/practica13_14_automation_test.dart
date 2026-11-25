import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:musica_masvida_mobile/features/auth/services/mobile_auth_service.dart';
import 'package:musica_masvida_mobile/features/events/models/upcoming_event.dart';
import 'package:musica_masvida_mobile/features/events/providers/event_provider.dart';
import 'package:musica_masvida_mobile/features/events/services/event_service.dart';

void main() {
  group('Pruebas unitarias | modelo, servicio y autenticación', () {
    test('AUT-01: convierte una respuesta válida del evento', () {
      final event = UpcomingEvent.fromJson({
        'id': 'evt-13',
        'title': 'Concierto',
        'date': '2026-11-20T00:00:00.000Z',
        'time': '18:30',
        'location': 'Auditorio',
        'capacity': 40,
      });

      expect(event.title, 'Concierto');
      expect(event.date, '20/11/2026');
      expect(event.capacity, 40);
    });

    test('AUT-02: datos vacíos y campos nulos usan valores por defecto', () {
      final event = UpcomingEvent.fromJson({
        'id': null,
        'title': null,
        'date': null,
        'time': null,
        'location': null,
        'capacity': null,
      });

      expect(event.id, isEmpty);
      expect(event.title, 'Sin título');
      expect(event.date, isEmpty);
      expect(event.capacity, 50);
    });

    test(
      'AUT-03: conserva la fecha inválida y normaliza capacidad decimal',
      () {
        final event = UpcomingEvent.fromJson({
          'id': 'evt-limit',
          'title': 'Evento límite',
          'date': '32/13/2026',
          'capacity': 30.9,
        });

        expect(event.date, '32/13/2026');
        expect(event.capacity, 30);
      },
    );

    test('HTTP 500 se propaga sin reintentar', () async {
      var requests = 0;
      final service = EventService(
        client: MockClient((_) async {
          requests++;
          return http.Response('Error interno', 500);
        }),
        maxAttempts: 3,
      );

      await expectLater(
        service.getUpcomingEvents(),
        throwsA(
          isA<Exception>().having(
            (error) => error.toString(),
            'mensaje',
            contains('500'),
          ),
        ),
      );
      expect(requests, 1);
    });

    test('login con QR vacío propaga la validación del servidor', () async {
      final service = MobileAuthService(
        client: MockClient((request) async {
          expect(jsonDecode(request.body), {'code': ''});
          return http.Response(
            jsonEncode({'message': 'El código QR es obligatorio'}),
            400,
          );
        }),
      );

      await expectLater(
        service.loginWithQr(''),
        throwsA(
          isA<Exception>().having(
            (error) => error.toString(),
            'mensaje',
            contains('obligatorio'),
          ),
        ),
      );
    });
  });

  group('AUT-04 y AUT-05 | integración entre Provider, Service y API', () {
    test('AUT-04: integra respuesta HTTP válida con el modelo', () async {
      final service = EventService(
        client: MockClient((request) async {
          expect(request.url.path, endsWith('/events/upcoming'));
          return http.Response(
            jsonEncode([
              {
                'id': 'evt-integrado',
                'title': 'Festival',
                'date': '2026-12-01T00:00:00.000Z',
                'time': '19:00',
                'location': 'Sala principal',
              },
            ]),
            200,
          );
        }),
        maxAttempts: 1,
      );
      final provider = EventProvider(eventService: service);

      await provider.fetchUpcomingEvents();

      expect(provider.status, EventStatus.loaded);
      expect(provider.events.single.date, '01/12/2026');
      expect(provider.events.single.title, 'Festival');
    });

    test(
      'AUT-05: el Provider expone un HTTP 500 como error de carga',
      () async {
        final service = EventService(
          client: MockClient((_) async => http.Response('Error interno', 500)),
          maxAttempts: 1,
        );
        final provider = EventProvider(eventService: service);

        await provider.fetchUpcomingEvents();

        expect(provider.status, EventStatus.error);
        expect(provider.errorMessage, contains('500'));
        expect(provider.events, isEmpty);
      },
    );
  });

  group('AUT-06 | persistencia remota e idempotencia', () {
    test(
      'AUT-06: una inscripción aceptada usa JWT y clave idempotente',
      () async {
        final service = EventService(
          client: MockClient((request) async {
            expect(request.method, 'POST');
            expect(request.headers['Authorization'], 'Bearer student-token');
            expect(request.headers['Idempotency-Key'], isNotEmpty);
            return http.Response('', 201);
          }),
          writeMaxAttempts: 1,
        );

        await expectLater(
          service.registerForEvent('evt-1', 'student-token'),
          completes,
        );
      },
    );

    test(
      'un reintento conserva la clave para no duplicar la inscripción',
      () async {
        final keys = <String?>[];
        var requests = 0;
        final service = EventService(
          client: MockClient((request) async {
            requests++;
            keys.add(request.headers['Idempotency-Key']);
            if (requests == 1) return http.Response('No disponible', 503);
            return http.Response('', 201);
          }),
          writeMaxAttempts: 2,
          writeRetryBaseDelay: Duration.zero,
        );

        await service.registerForEvent('evt-1', 'student-token');

        expect(requests, 2);
        expect(keys.first, isNotEmpty);
        expect(keys[1], keys.first);
      },
    );
  });
}
