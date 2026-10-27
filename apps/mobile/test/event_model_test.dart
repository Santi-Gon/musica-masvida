import 'package:flutter_test/flutter_test.dart';
import 'package:musica_masvida_mobile/features/events/models/upcoming_event.dart';

void main() {
  group('UpcomingEvent.fromJson', () {
    // -------------------------------------------------------------------------
    // Caso exitoso: JSON completo con todos los campos
    // -------------------------------------------------------------------------
    test('debe crear un evento con todos los campos correctamente', () {
      final json = {
        'id': '1',
        'title': 'Concierto de Navidad',
        'date': '2026-12-20T00:00:00.000Z',
        'time': '18:00',
        'location': 'Auditorio Principal',
      };

      final event = UpcomingEvent.fromJson(json);

      expect(event.id, '1');
      expect(event.title, 'Concierto de Navidad');
      expect(event.time, '18:00');
      expect(event.location, 'Auditorio Principal');
    });

    // -------------------------------------------------------------------------
    // Formato de fecha: ISO 8601 → DD/MM/YYYY
    // -------------------------------------------------------------------------
    test('debe formatear la fecha de ISO 8601 a DD/MM/YYYY', () {
      final json = {
        'id': '2',
        'title': 'Recital de Primavera',
        'date': '2026-04-05T00:00:00.000Z',
        'time': '19:30',
        'location': 'Sala de Conciertos',
      };

      final event = UpcomingEvent.fromJson(json);

      expect(event.date, '05/04/2026');
    });

    test('debe formatear correctamente fechas con día y mes de un solo dígito', () {
      final json = {
        'id': '3',
        'title': 'Ensayo General',
        'date': '2026-01-07T06:00:00.000Z',
        'time': '10:00',
        'location': 'Sala B',
      };

      final event = UpcomingEvent.fromJson(json);

      // Verificar que día y mes tienen cero a la izquierda (DD/MM/YYYY)
      expect(event.date, matches(RegExp(r'^\d{2}/\d{2}/\d{4}$')));
    });

    // -------------------------------------------------------------------------
    // Manejo de campos nulos / ausentes
    // -------------------------------------------------------------------------
    test('debe usar valores por defecto cuando los campos son nulos', () {
      final event = UpcomingEvent.fromJson({});

      expect(event.id, '');
      expect(event.title, 'Sin título');
      expect(event.time, '');
      expect(event.location, '');
    });

    test('debe manejar una fecha inválida sin lanzar excepción', () {
      final json = {
        'id': '4',
        'title': 'Evento con fecha rara',
        'date': 'no-es-una-fecha',
        'time': '12:00',
        'location': 'Cafetería',
      };

      // No debe lanzar excepción, simplemente deja el valor original
      expect(() => UpcomingEvent.fromJson(json), returnsNormally);

      final event = UpcomingEvent.fromJson(json);
      expect(event.date, 'no-es-una-fecha');
    });

    test('debe manejar campo date nulo sin lanzar excepción', () {
      final json = {
        'id': '5',
        'title': 'Sin fecha',
        'date': null,
        'time': '15:00',
        'location': 'Online',
      };

      expect(() => UpcomingEvent.fromJson(json), returnsNormally);
      final event = UpcomingEvent.fromJson(json);
      expect(event.date, ''); // valor por defecto cuando date es null
    });

    // -------------------------------------------------------------------------
    // Integridad del modelo
    // -------------------------------------------------------------------------
    test('el método toString() debe incluir los campos principales', () {
      final json = {
        'id': '10',
        'title': 'Festival de Jazz',
        'date': '2026-07-15T00:00:00.000Z',
        'time': '20:00',
        'location': 'Plaza Central',
      };

      final event = UpcomingEvent.fromJson(json);
      final str = event.toString();

      expect(str, contains('Festival de Jazz'));
      expect(str, contains('15/07/2026'));
      expect(str, contains('20:00'));
      expect(str, contains('Plaza Central'));
    });

    test('toJson() debe retornar un mapa con todos los campos', () {
      final json = {
        'id': '7',
        'title': 'Clase Magistral',
        'date': '2026-09-10T00:00:00.000Z',
        'time': '09:00',
        'location': 'Aula 3',
      };

      final event = UpcomingEvent.fromJson(json);
      final map = event.toJson();

      expect(map['id'], '7');
      expect(map['title'], 'Clase Magistral');
      expect(map['time'], '09:00');
      expect(map['location'], 'Aula 3');
      // La fecha en toJson debe ser la ya formateada (DD/MM/YYYY)
      expect(map['date'], '10/09/2026');
    });
  });
}
