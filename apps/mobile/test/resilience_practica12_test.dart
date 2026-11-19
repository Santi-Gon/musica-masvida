import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:musica_masvida_mobile/features/auth/providers/auth_provider.dart';
import 'package:musica_masvida_mobile/features/events/providers/event_provider.dart';
import 'package:musica_masvida_mobile/features/events/services/event_service.dart';

/// Práctica 12 — Matriz de resiliencia (RES-01 … RES-09).
///
/// Cada escenario se ejecuta de verdad contra un cliente HTTP simulado que
/// reproduce el fallo; se registran tiempos de detección y recuperación en
/// `evidencias/practica12/resilience_results.json`.
///
/// Ejecutar: flutter test test/resilience_practica12_test.dart
const int _networkDelayMs = 30;

Map<String, dynamic> _event(int i) => {
      'id': 'evt-$i',
      'title': 'Evento $i',
      'date': '2026-12-0${(i % 9) + 1}T18:00:00.000Z',
      'time': '18:00',
      'location': 'Sala $i',
      'description': 'Descripción $i',
      'capacity': 50,
    };

final Map<String, dynamic> _results = {
  'fecha': DateTime.now().toIso8601String(),
  'escenarios': <Map<String, dynamic>>[],
};

void _record(Map<String, dynamic> data) {
  (_results['escenarios'] as List).add(data);
  // ignore: avoid_print
  print('RESULT ${jsonEncode(data)}');
}

http.Response _okResponse([int count = 3]) => http.Response(
      jsonEncode(List.generate(count, _event)),
      200,
      headers: {'content-type': 'application/json'},
    );

/// Cliente que falla [failures] veces antes de responder correctamente.
http.Client _flakyClient(int failures, {int status = 503}) {
  var calls = 0;
  return MockClient((_) async {
    calls++;
    await Future<void>.delayed(const Duration(milliseconds: _networkDelayMs));
    if (calls <= failures) {
      if (status == 0) throw http.ClientException('connection refused');
      if (status == -1) throw TimeoutException('sin respuesta');
      return http.Response('{"message":"servicio no disponible"}', status);
    }
    return _okResponse();
  });
}

EventService _service(http.Client client, {int maxAttempts = 3}) => EventService(
      client: client,
      maxAttempts: maxAttempts,
      retryBaseDelay: const Duration(milliseconds: 20),
    );

void main() {
  tearDownAll(() {
    final file = File('../../evidencias/practica12/resilience_results.json');
    file.parent.createSync(recursive: true);
    file.writeAsStringSync(
      const JsonEncoder.withIndent('  ').convert(_results),
    );
  });

  test('RES-01 API caída (conexión rechazada): detecta y no cuelga', () async {
    final service = _service(_flakyClient(99, status: 0));
    final sw = Stopwatch()..start();
    Object? error;
    try {
      await service.getUpcomingEvents();
    } catch (e) {
      error = e;
    }
    sw.stop();
    final reintentos = service.metrics['reintentos'];

    final provider = EventProvider(eventService: service);
    await provider.fetchUpcomingEvents();

    _record({
      'id': 'RES-01',
      'escenario': 'API caída total (conexión rechazada)',
      'resultado': error is http.ClientException ? 'fallo controlado' : 'inesperado',
      'deteccionMs': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'reintentos': reintentos,
      'mensajeUsuario': provider.errorMessage,
      'estado': provider.status.name,
    });
    expect(error, isA<http.ClientException>());
    expect(provider.hasError, isTrue);
    expect(provider.errorMessage, contains('No se pudo conectar'));
  });

  test('RES-02 Timeout de red: reintenta y reporta timeout', () async {
    final service = _service(_flakyClient(99, status: -1));
    final sw = Stopwatch()..start();
    Object? error;
    try {
      await service.getUpcomingEvents();
    } catch (e) {
      error = e;
    }
    sw.stop();
    final reintentos = service.metrics['reintentos'];

    final provider = EventProvider(eventService: service);
    await provider.fetchUpcomingEvents();

    _record({
      'id': 'RES-02',
      'escenario': 'Timeout de red persistente',
      'resultado': error is TimeoutException ? 'timeout controlado' : 'inesperado',
      'deteccionMs': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'reintentos': reintentos,
      'mensajeUsuario': provider.errorMessage,
    });
    expect(error, isA<TimeoutException>());
    expect(provider.errorMessage, contains('tardó demasiado'));
  });

  test('RES-03 Error 500: falla rápido sin reintentar', () async {
    var calls = 0;
    final client = MockClient((_) async {
      calls++;
      return http.Response('boom', 500);
    });
    final service = _service(client);
    final sw = Stopwatch()..start();
    Object? error;
    try {
      await service.getUpcomingEvents();
    } catch (e) {
      error = e;
    }
    sw.stop();

    _record({
      'id': 'RES-03',
      'escenario': 'Respuesta 500 del servidor',
      'resultado': error is Exception ? 'error controlado' : 'inesperado',
      'deteccionMs': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'peticionesHttp': calls,
      'reintentos': service.metrics['reintentos'],
    });
    expect(calls, 1, reason: 'un 500 no debe multiplicar la carga');
    expect(error.toString(), contains('500'));
  });

  test('RES-04 503 transitorio: reintenta y se recupera', () async {
    final service = _service(_flakyClient(1, status: 503));
    final sw = Stopwatch()..start();
    final events = await service.getUpcomingEvents();
    sw.stop();

    _record({
      'id': 'RES-04',
      'escenario': 'Un fallo 503 y luego éxito',
      'resultado': 'recuperado',
      'recuperacionMs': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'reintentos': service.metrics['reintentos'],
      'eventos': events.length,
    });
    expect(events, hasLength(3));
    expect(service.metrics['reintentos'], 1);
  });

  test('RES-05 Respuesta malformada: excepción controlada, sin crash', () async {
    final client = MockClient((_) async => http.Response('<html>error</html>', 200));
    final service = _service(client);

    Object? error;
    final sw = Stopwatch()..start();
    try {
      await service.getUpcomingEvents();
    } catch (e) {
      error = e;
    }
    sw.stop();

    _record({
      'id': 'RES-05',
      'escenario': 'HTTP 200 con cuerpo no JSON',
      'resultado': error is FormatException ? 'excepción controlada' : 'inesperado',
      'deteccionMs': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'reintentos': service.metrics['reintentos'],
    });
    expect(error, isA<FormatException>());
  });

  test('RES-06 Escritura duplicada: 409 clasificado como conflicto', () async {
    final client = MockClient((_) async => http.Response(
          jsonEncode({'message': 'Ya estás inscrito en este evento'}),
          409,
          headers: {'content-type': 'application/json'},
        ));
    final service = _service(client);

    Object? error;
    try {
      await service.registerForEvent('evt-1', 'token');
    } catch (e) {
      error = e;
    }

    _record({
      'id': 'RES-06',
      'escenario': 'Registro duplicado (409)',
      'resultado': error is AlreadyRegisteredException ? 'conflicto clasificado' : 'inesperado',
      'mensaje': error.toString(),
    });
    expect(error, isA<AlreadyRegisteredException>());
    expect(error.toString(), contains('Ya estás inscrito'));
  });

  test('RES-07 Caché degrada con gracia cuando la red cae', () async {
    var online = true;
    final client = MockClient((_) async {
      if (!online) throw http.ClientException('sin red');
      return _okResponse();
    });
    final service = EventService(
      client: client,
      maxAttempts: 1,
      retryBaseDelay: const Duration(milliseconds: 10),
    );

    final first = await service.getUpcomingEvents();
    online = false;
    final sw = Stopwatch()..start();
    final second = await service.getUpcomingEvents();
    sw.stop();

    _record({
      'id': 'RES-07',
      'escenario': 'Red caída después de una lectura exitosa',
      'resultado': second.length == first.length ? 'sirvió caché' : 'datos inconsistentes',
      'respuestaMs': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'peticionesHttp': service.metrics['peticionesHttp'],
      'aciertosCache': service.metrics['aciertosCache'],
    });
    expect(second, hasLength(3));
    expect(service.metrics['peticionesHttp'], 1, reason: 'no debe intentar red con caché válida');
  });

  test('RES-08 Recuperación tras fallo: el reintento manual restaura el estado', () async {
    var down = true;
    final client = MockClient((_) async {
      if (down) throw http.ClientException('sin red');
      return _okResponse();
    });
    final service = EventService(
      client: client,
      maxAttempts: 2,
      retryBaseDelay: const Duration(milliseconds: 10),
    );
    final provider = EventProvider(eventService: service);

    final sw = Stopwatch()..start();
    await provider.fetchUpcomingEvents();
    final estadoFallo = provider.status.name;
    down = false;
    await provider.refresh();
    sw.stop();

    _record({
      'id': 'RES-08',
      'escenario': 'Fallo total y reconexión',
      'resultado': provider.hasData ? 'recuperado y consistente' : 'sin datos',
      'estadoTrasFallo': estadoFallo,
      'recuperacionMs': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'eventosTrasRecuperar': provider.events.length,
    });
    expect(estadoFallo, 'error');
    expect(provider.status.name, 'loaded');
    expect(provider.events, hasLength(3));
  });

  test('RES-09 Sesión: token inválido no autentica ni rompe el estado', () {
    final provider = AuthProvider(initialToken: null);
    expect(provider.isAuthenticated, isFalse);
    expect(provider.token, isNull);

    _record({
      'id': 'RES-09',
      'escenario': 'Sesión sin token',
      'resultado': provider.isAuthenticated ? 'inesperado' : 'rechazo correcto',
      'autenticado': provider.isAuthenticated,
    });
  });
}
