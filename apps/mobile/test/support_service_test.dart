import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:musica_masvida_mobile/features/support/models/support_ticket.dart';
import 'package:musica_masvida_mobile/features/support/services/support_service.dart';

void main() {
  test(
    'envía ticket con categoría API y token JWT, y devuelve su ID',
    () async {
      final client = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, endsWith('/tickets'));
        expect(request.headers['Authorization'], 'Bearer student-token');
        expect(request.headers['Content-Type'], 'application/json');
        expect(jsonDecode(request.body), {
          'title': 'Error al inscribirme',
          'description': 'La inscripción muestra un error.',
          'category': 'EVENT_REGISTRATION',
        });
        return http.Response(jsonEncode({'id': 'ticket-123'}), 201);
      });
      final service = SupportService(client: client);

      final response = await service.submitTicket(
        ticket: const SupportTicketRequest(
          title: 'Error al inscribirme',
          description: 'La inscripción muestra un error.',
          category: SupportTicketCategory.eventRegistration,
        ),
        token: 'student-token',
      );

      expect(response.id, 'ticket-123');
    },
  );

  test('expone el mensaje de error devuelto por la API', () async {
    final service = SupportService(
      client: MockClient(
        (_) async =>
            http.Response(jsonEncode({'message': 'La sesión expiró'}), 401),
      ),
    );

    await expectLater(
      service.submitTicket(
        ticket: const SupportTicketRequest(
          title: 'Otro',
          description: 'Descripción del incidente.',
          category: SupportTicketCategory.other,
        ),
        token: 'expired-token',
      ),
      throwsA(
        isA<Exception>().having(
          (error) => error.toString(),
          'message',
          contains('La sesión expiró'),
        ),
      ),
    );
  });
}
