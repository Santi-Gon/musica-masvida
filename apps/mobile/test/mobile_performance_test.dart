import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:musica_masvida_mobile/features/events/models/upcoming_event.dart';
import 'package:musica_masvida_mobile/features/events/services/event_service.dart';

/// Práctica 12 — Benchmark de operaciones móviles (antes/después).
///
/// Ejecutar:
///   flutter test --dart-define=BENCH_LABEL=antes test/mobile_performance_test.dart
///   flutter test --dart-define=BENCH_LABEL=despues test/mobile_performance_test.dart
const String label = String.fromEnvironment('BENCH_LABEL', defaultValue: 'antes');
const int iterations = 10000;
const int networkDelayMs = 120;

Map<String, dynamic> _eventJson(int i) => {
      'id': 'evt-$i',
      'title': 'Concierto de prueba $i',
      'date': DateTime(2026, 12, 1 + (i % 27), 18).toUtc().toIso8601String(),
      'time': '18:00',
      'location': 'Auditorio ${i % 20}',
      'description': 'Descripción del evento $i',
      'capacity': 50 + (i % 100),
    };

void _writeResult(Map<String, dynamic> data) {
  final file = File('../../evidencias/practica12/mobile_bench_$label.json');
  file.parent.createSync(recursive: true);
  file.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(data));
  // ignore: avoid_print
  print('BENCH_RESULT ${jsonEncode(data)}');
}

void main() {
  test('parseo de $iterations eventos (procesamiento de datos)', () {
    final payload = List.generate(iterations, _eventJson);
    final rssBefore = ProcessInfo.currentRss;

    final samples = <double>[];
    List<UpcomingEvent>? last;
    for (var run = 0; run < 5; run++) {
      final sw = Stopwatch()..start();
      last = payload.map(UpcomingEvent.fromJson).toList();
      sw.stop();
      samples.add(sw.elapsedMicroseconds / 1000);
    }
    final rssAfter = ProcessInfo.currentRss;
    samples.sort();

    final avg = samples.reduce((a, b) => a + b) / samples.length;
    final result = {
      'label': label,
      'timestamp': DateTime.now().toIso8601String(),
      'operacion': 'UpcomingEvent.fromJson',
      'iteraciones': iterations,
      'corridasMs': samples.map((e) => double.parse(e.toStringAsFixed(2))).toList(),
      'promedioMs': double.parse(avg.toStringAsFixed(2)),
      'minMs': double.parse(samples.first.toStringAsFixed(2)),
      'maxMs': double.parse(samples.last.toStringAsFixed(2)),
      'eventosPorSegundo': (iterations / (avg / 1000)).round(),
      'eventosParseados': last?.length,
      'rssAntesMB': (rssBefore / 1024 / 1024).toStringAsFixed(1),
      'rssDespuesMB': (rssAfter / 1024 / 1024).toStringAsFixed(1),
      'maxRssMB': (ProcessInfo.maxRss / 1024 / 1024).toStringAsFixed(1),
    };
    _writeResult(result);
    expect(last, hasLength(iterations));
  });

  test('consulta: primera llamada y llamada repetida (caché)', () async {
    var requests = 0;
    final client = MockClient((_) async {
      requests++;
      await Future<void>.delayed(const Duration(milliseconds: networkDelayMs));
      return http.Response(
        jsonEncode(List.generate(3, _eventJson)),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    final service = EventService(client: client);

    final sw1 = Stopwatch()..start();
    await service.getUpcomingEvents();
    sw1.stop();
    final sw2 = Stopwatch()..start();
    await service.getUpcomingEvents();
    sw2.stop();

    final result = {
      'label': label,
      'timestamp': DateTime.now().toIso8601String(),
      'operacion': 'getUpcomingEvents x2',
      'primeraMs': double.parse((sw1.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'segundaMs': double.parse((sw2.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'peticionesHttp': requests,
      'cacheFunciono': requests == 1,
    };
    _writeResult(result);
    expect(requests, lessThanOrEqualTo(2));
  });

  test('consulta: 5 llamadas simultáneas (deduplicación in-flight)', () async {
    var requests = 0;
    final client = MockClient((_) async {
      requests++;
      await Future<void>.delayed(const Duration(milliseconds: networkDelayMs));
      return http.Response(
        jsonEncode(List.generate(3, _eventJson)),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    final service = EventService(client: client);

    final sw = Stopwatch()..start();
    await Future.wait(List.generate(5, (_) => service.getUpcomingEvents()));
    sw.stop();

    final result = {
      'label': label,
      'timestamp': DateTime.now().toIso8601String(),
      'operacion': 'getUpcomingEvents x5 concurrentes',
      'totalMs': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'peticionesHttp': requests,
      'deduplicado': requests == 1,
    };
    _writeResult(result);
    expect(requests, lessThanOrEqualTo(5));
  });

  test('escritura: registro de evento (POST)', () async {
    var requests = 0;
    final client = MockClient((req) async {
      requests++;
      await Future<void>.delayed(const Duration(milliseconds: networkDelayMs));
      return http.Response('', 201);
    });
    final service = EventService(client: client);

    final sw = Stopwatch()..start();
    await service.registerForEvent('evt-1', 'token');
    sw.stop();

    final result = {
      'label': label,
      'timestamp': DateTime.now().toIso8601String(),
      'operacion': 'registerForEvent',
      'ms': double.parse((sw.elapsedMicroseconds / 1000).toStringAsFixed(2)),
      'peticionesHttp': requests,
    };
    _writeResult(result);
    expect(requests, 1);
  });
}
