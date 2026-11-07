import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/upcoming_event.dart';
import '../../../core/constants/app_constants.dart';

/// Servicio de red para los endpoints de eventos de la API REST.
///
/// Usa el paquete [http] para comunicarse con el backend NestJS.
/// URL base: [AppConstants.baseUrl]
class EventService {
  final http.Client _client;
  final bool useMock;

  EventService({http.Client? client, this.useMock = false})
      : _client = client ?? http.Client();

  /// Obtiene la lista de próximos eventos desde GET /events/upcoming.
  ///
  /// Lanza una [Exception] si la respuesta HTTP no es exitosa (código != 200).
  Future<List<UpcomingEvent>> getUpcomingEvents() async {
    if (useMock) {
      // Retornamos datos locales simulados directamente cuando useMock es true.
      await Future.delayed(const Duration(milliseconds: 50));
      return [
        const UpcomingEvent(
          id: '1',
          title: 'Concierto de Primavera',
          date: '21/09/2026',
          time: '19:00',
          location: 'Auditorio Principal',
        ),
        const UpcomingEvent(
          id: '2',
          title: 'Ensayo General - Coro',
          date: '25/09/2026',
          time: '17:30',
          location: 'Sala 4',
        ),
        const UpcomingEvent(
          id: '3',
          title: 'Masterclass de Guitarra',
          date: '30/09/2026',
          time: '10:00',
          location: 'Aula Virtual',
        ),
      ];
    }

    final uri = Uri.parse('${AppConstants.baseUrl}/events/upcoming');

    try {
      final response = await _client
          .get(uri, headers: {'Content-Type': 'application/json'})
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body) as List;
        return jsonList
            .map((e) => UpcomingEvent.fromJson(e as Map<String, dynamic>))
            .toList();
      } else {
        throw Exception(
          'Error al cargar eventos. Código: ${response.statusCode}',
        );
      }
    } on Exception {
      rethrow;
    }
  }

  Future<bool> isRegistered(String eventId, String token) async {
    if (useMock) return false;

    final response = await _client
        .get(
          Uri.parse('${AppConstants.baseUrl}/events/$eventId/registration'),
          headers: {'Authorization': 'Bearer $token'},
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode != 200) {
      throw _responseException(response);
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return data['registered'] as bool? ?? false;
  }

  Future<void> registerForEvent(String eventId, String token) async {
    if (useMock) return;

    final response = await _client
        .post(
          Uri.parse('${AppConstants.baseUrl}/events/$eventId/register'),
          headers: {'Authorization': 'Bearer $token'},
        )
        .timeout(const Duration(seconds: 10));

    if (response.statusCode != 201) {
      throw _responseException(response);
    }
  }

  Exception _responseException(http.Response response) {
    try {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final message = data['message'];
      if (message is String) return Exception(message);
      if (message is List) return Exception(message.join('\n'));
    } on FormatException {
      return Exception('Error HTTP ${response.statusCode}');
    }
    return Exception('Error HTTP ${response.statusCode}');
  }
}
