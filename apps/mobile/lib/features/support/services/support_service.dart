import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/constants/app_constants.dart';
import '../models/support_ticket.dart';

class SupportService {
  SupportService({http.Client? client})
    : _client = client ?? http.Client(),
      _ownsClient = client == null;

  final http.Client _client;
  final bool _ownsClient;

  Future<SupportTicketResponse> submitTicket({
    required SupportTicketRequest ticket,
    required String token,
  }) async {
    try {
      final response = await _client
          .post(
            Uri.parse('${AppConstants.baseUrl}/tickets'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode(ticket.toJson()),
          )
          .timeout(const Duration(seconds: 15));

      final dynamic decoded;
      try {
        decoded = jsonDecode(response.body);
      } on FormatException {
        throw Exception('El servidor devolvió una respuesta no válida.');
      }

      if (response.statusCode != 201 && response.statusCode != 200) {
        throw Exception(_messageFrom(decoded, response.statusCode));
      }
      if (decoded is! Map<String, dynamic>) {
        throw Exception('El servidor devolvió una respuesta no válida.');
      }
      return SupportTicketResponse.fromJson(decoded);
    } on TimeoutException {
      throw Exception('La solicitud tardó demasiado. Intenta de nuevo.');
    } on http.ClientException {
      throw Exception('No se pudo conectar al servidor. Revisa tu conexión.');
    }
  }

  String _messageFrom(dynamic decoded, int statusCode) {
    if (decoded is Map<String, dynamic>) {
      final message = decoded['message'];
      if (message is String && message.isNotEmpty) return message;
      if (message is List && message.isNotEmpty) return message.join('\n');
    }
    return 'No se pudo enviar el reporte (error $statusCode).';
  }

  void close() {
    if (_ownsClient) _client.close();
  }
}
