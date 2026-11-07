import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:musica_masvida_mobile/features/events/services/event_service.dart';

void main() {
  test('consulta el estado de inscripción con el JWT del alumno', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, endsWith('/events/event-1/registration'));
      expect(request.headers['Authorization'], 'Bearer student-token');
      return http.Response(
        jsonEncode({'registered': true}),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final service = EventService(client: client, useMock: false);

    expect(await service.isRegistered('event-1', 'student-token'), isTrue);
  });

  test('envía inscripción autenticada y conserva el error de cupo completo', () async {
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, endsWith('/events/event-1/register'));
      expect(request.headers['Authorization'], 'Bearer student-token');
      return http.Response(
        jsonEncode({'message': 'El evento ya no tiene lugares disponibles'}),
        409,
        headers: {'content-type': 'application/json'},
      );
    });

    final service = EventService(client: client, useMock: false);

    await expectLater(
      service.registerForEvent('event-1', 'student-token'),
      throwsA(isA<Exception>().having(
        (error) => error.toString(),
        'message',
        contains('lugares disponibles'),
      )),
    );
  });
}
