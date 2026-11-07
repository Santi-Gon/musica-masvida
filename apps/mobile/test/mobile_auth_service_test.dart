import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:musica_masvida_mobile/features/auth/services/mobile_auth_service.dart';

void main() {
  test('intercambia el código QR por un token de acceso', () async {
    final client = MockClient((request) async {
      expect(request.url.path, endsWith('/auth/mobile-login'));
      expect(jsonDecode(request.body), {'code': 'one-time-code'});
      return http.Response(
        jsonEncode({'accessToken': 'signed-user-token'}),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final service = MobileAuthService(client: client);

    expect(await service.loginWithQr('one-time-code'), 'signed-user-token');
  });

  test('expone el error del servidor cuando el QR expiró', () async {
    final client = MockClient((_) async {
      return http.Response(
        jsonEncode({'message': 'El código QR no es válido o ya expiró'}),
        401,
        headers: {'content-type': 'application/json'},
      );
    });

    final service = MobileAuthService(client: client);

    await expectLater(
      service.loginWithQr('expired-code'),
      throwsA(isA<Exception>().having(
        (error) => error.toString(),
        'message',
        contains('ya expiró'),
      )),
    );
  });
}
