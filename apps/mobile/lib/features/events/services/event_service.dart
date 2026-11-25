import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

import '../models/upcoming_event.dart';
import '../../../core/constants/app_constants.dart';

/// Excepción de escritura que ya estaba aplicada en el servidor (HTTP 409).
///
/// Permite distinguir un conflicto de negocio (duplicado) de un fallo real,
/// sin romper el contrato previo: sigue siendo una [Exception] con el mensaje
/// que devuelve el backend.
class AlreadyRegisteredException implements Exception {
  final String message;
  AlreadyRegisteredException(this.message);
  @override
  String toString() => 'Exception: $message';
}

class _TransientHttpException implements Exception {
  final String message;
  _TransientHttpException(this.message);
  @override
  String toString() => 'Exception: $message';
}

class _CacheEntry {
  _CacheEntry(this.events, this.expiresAt);
  final List<UpcomingEvent> events;
  final DateTime expiresAt;
}

/// Servicio de red para los endpoints de eventos de la API REST.
///
/// Usa el paquete [http] para comunicarse con el backend NestJS.
/// URL base: [AppConstants.baseUrl]
///
/// Optimizaciones de la Práctica 12:
/// - **Caché TTL** de las lecturas idénticas (evita viajes de red repetidos).
/// - **Deduplicación in-flight**: varias llamadas simultáneas comparten una
///   sola petición HTTP.
/// - **Reintentos con backoff exponencial y jitter** para fallos transitorios
///   de red en operaciones idempotentes (GET).
class EventService {
  final http.Client _client;
  final bool useMock;

  /// Tiempo de vida de la caché de lecturas.
  late final Duration _cacheTtl;

  /// Número máximo de intentos para lecturas (1 = sin reintentos).
  late final int _maxAttempts;

  /// Base del backoff exponencial entre reintentos.
  late final Duration _retryBaseDelay;

  /// Configuración de reintentos para escrituras idempotentes.
  late final int _writeMaxAttempts;
  late final Duration _writeRetryBaseDelay;

  final Map<String, _CacheEntry> _cache = {};
  final Map<String, Future<List<UpcomingEvent>>> _inFlight = {};
  final Random _random = Random();

  int _requests = 0;
  int _cacheHits = 0;
  int _retries = 0;

  EventService({
    http.Client? client,
    this.useMock = false,
    Duration cacheTtl = const Duration(seconds: 30),
    int maxAttempts = 3,
    Duration retryBaseDelay = const Duration(milliseconds: 200),
    int writeMaxAttempts = 5,
    Duration writeRetryBaseDelay = const Duration(seconds: 1),
  }) : _client = client ?? http.Client() {
    _cacheTtl = cacheTtl;
    _maxAttempts = maxAttempts;
    _retryBaseDelay = retryBaseDelay;
    _writeMaxAttempts = writeMaxAttempts;
    _writeRetryBaseDelay = writeRetryBaseDelay;
  }

  /// Contadores locales usados como evidencia de rendimiento.
  Map<String, int> get metrics => {
    'peticionesHttp': _requests,
    'aciertosCache': _cacheHits,
    'reintentos': _retries,
  };

  /// Limpia la caché (por ejemplo, tras una escritura o un pull-to-refresh).
  void clearCache() => _cache.clear();

  /// Obtiene la lista de próximos eventos desde GET /events/upcoming.
  ///
  /// Por defecto usa la caché TTL; con [forceRefresh] fuerza una lectura nueva.
  /// Lanza una [Exception] si la respuesta HTTP no es exitosa (código != 200).
  Future<List<UpcomingEvent>> getUpcomingEvents({bool forceRefresh = false}) {
    if (useMock) {
      // Retornamos datos locales simulados directamente cuando useMock es true.
      return Future.delayed(
        const Duration(milliseconds: 50),
        () => <UpcomingEvent>[
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
        ],
      );
    }

    if (!forceRefresh) {
      final cached = _cache['upcoming'];
      if (cached != null && cached.expiresAt.isAfter(DateTime.now())) {
        _cacheHits++;
        return Future.value(cached.events);
      }
      final pending = _inFlight['upcoming'];
      if (pending != null) return pending;
    }

    final future = _fetchUpcoming();
    _inFlight['upcoming'] = future;
    return future.whenComplete(() {
      if (identical(_inFlight['upcoming'], future)) {
        _inFlight.remove('upcoming');
      }
    });
  }

  Future<List<UpcomingEvent>> _fetchUpcoming() async {
    final uri = Uri.parse('${AppConstants.baseUrl}/events/upcoming');

    return _withRetry(() async {
      _requests++;
      final response = await _client
          .get(uri, headers: {'Content-Type': 'application/json'})
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body) as List;
        final events = jsonList
            .map((e) => UpcomingEvent.fromJson(e as Map<String, dynamic>))
            .toList();
        _cache['upcoming'] = _CacheEntry(
          List<UpcomingEvent>.unmodifiable(events),
          DateTime.now().add(_cacheTtl),
        );
        return events;
      }

      final message = 'Error al cargar eventos. Código: ${response.statusCode}';
      if (response.statusCode == 502 ||
          response.statusCode == 503 ||
          response.statusCode == 504) {
        throw _TransientHttpException(message);
      }
      throw Exception(message);
    });
  }

  Future<bool> isRegistered(String eventId, String token) async {
    if (useMock) return false;

    return _withRetry(() async {
      _requests++;
      final response = await _client
          .get(
            Uri.parse('${AppConstants.baseUrl}/events/$eventId/registration'),
            headers: {
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) {
        throw _responseException(response);
      }

      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('La respuesta de inscripción no es válida');
      }
      final registered = decoded['registered'];
      if (registered == null) return false;
      if (registered is bool) return registered;
      throw const FormatException(
        'El campo registered de la respuesta no es booleano',
      );
    });
  }

  Future<void> registerForEvent(String eventId, String token) async {
    if (useMock) return;

    final idempotencyKey = _generateIdempotencyKey();

    Future<void> attempt() async {
      _requests++;
      final response = await _client
          .post(
            Uri.parse('${AppConstants.baseUrl}/events/$eventId/register'),
            headers: {
              'Authorization': 'Bearer $token',
              'Idempotency-Key': idempotencyKey,
            },
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode == 201) return;
      if (response.statusCode == 409) {
        throw AlreadyRegisteredException(_messageOf(response));
      }
      if (response.statusCode == 408 ||
          response.statusCode == 429 ||
          response.statusCode >= 500) {
        throw _TransientHttpException(
          'Error transitorio en escritura: ${response.statusCode}',
        );
      }
      throw _responseException(response);
    }

    return _withRetry(
      attempt,
      maxAttempts: _writeMaxAttempts,
      retryBaseDelay: _writeRetryBaseDelay,
    );
  }

  String _generateIdempotencyKey() {
    return '${DateTime.now().millisecondsSinceEpoch}_${_random.nextInt(1 << 31)}';
  }

  /// Reintenta solo fallos transitorios (red o 5xx de pasarela).
  ///
  /// No reintenta errores de negocio ni respuestas 4xx: repetirlos no cambia
  /// el resultado y multiplicaría la carga del servidor.
  Future<T> _withRetry<T>(
    Future<T> Function() action, {
    int? maxAttempts,
    Duration? retryBaseDelay,
  }) async {
    final attempts = maxAttempts ?? _maxAttempts;
    final baseDelay = retryBaseDelay ?? _retryBaseDelay;
    var attempt = 0;
    while (true) {
      attempt++;
      try {
        return await action();
      } catch (e) {
        if (attempt >= attempts || !_isRetriable(e)) rethrow;
        _retries++;
        final backoffMs = baseDelay.inMilliseconds * (1 << (attempt - 1));
        final jitterMs = _random.nextInt(100);
        await Future<void>.delayed(
          Duration(milliseconds: backoffMs + jitterMs),
        );
      }
    }
  }

  bool _isRetriable(Object error) =>
      error is TimeoutException ||
      error is http.ClientException ||
      error is _TransientHttpException;

  String _messageOf(http.Response response) {
    try {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final message = data['message'];
      if (message is String) return message;
      if (message is List) return message.join('\n');
    } on FormatException {
      return 'Error HTTP ${response.statusCode}';
    }
    return 'Error HTTP ${response.statusCode}';
  }

  Exception _responseException(http.Response response) {
    final message = _messageOf(response);
    return Exception(message);
  }
}
