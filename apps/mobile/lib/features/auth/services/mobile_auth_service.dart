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

    if (response.statusCode != 200) {
      throw Exception(_errorMessage(response));
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException(
        'La respuesta de inicio de sesión no es válida',
      );
    }

    final data = decoded;
    final token = data['accessToken'];
    if (token is! String || token.isEmpty) {
      throw Exception('La respuesta del servidor no contiene un token válido');
    }
    return token;
  }

  String _errorMessage(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final message = decoded['message'];
        if (message is String && message.isNotEmpty) return message;
        if (message is List) return message.join('\n');
      }
    } on FormatException {
      return 'No se pudo iniciar sesión (HTTP ${response.statusCode})';
    }
    return 'No se pudo iniciar sesión (HTTP ${response.statusCode})';
  }
}
