import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/constants/app_constants.dart';

class MobileAuthService {
  final http.Client _client;

  MobileAuthService({http.Client? client}) : _client = client ?? http.Client();

  Future<String> loginWithQr(String code) async {
    final response = await _client
        .post(
          Uri.parse('${AppConstants.baseUrl}/auth/mobile-login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'code': code}),
        )
        .timeout(const Duration(seconds: 10));

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      final message = data['message'];
      throw Exception(message is String ? message : 'No se pudo iniciar sesión');
    }

    final token = data['accessToken'];
    if (token is! String || token.isEmpty) {
      throw Exception('La respuesta del servidor no contiene un token válido');
    }
    return token;
  }
}
