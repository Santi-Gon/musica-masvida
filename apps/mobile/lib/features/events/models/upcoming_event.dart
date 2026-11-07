/// Modelo de datos para un Evento Próximo (UpcomingEvent).
///
/// Campos del JSON del backend (NestJS):
///   - id: identificador único
///   - title: nombre del evento
///   - date: fecha en ISO 8601 (se formatea a DD/MM/YYYY)
///   - time: hora como string (ej. "18:00")
///   - location: lugar del evento
class UpcomingEvent {
  final String id;
  final String title;

  /// Fecha formateada como DD/MM/YYYY (ya procesada desde ISO 8601).
  final String date;

  final String time;
  final String location;
  final String description;
  final int capacity;

  const UpcomingEvent({
    required this.id,
    required this.title,
    required this.date,
    required this.time,
    required this.location,
    this.description = '',
    this.capacity = 50,
  });

  /// Construye un [UpcomingEvent] desde un mapa JSON.
  ///
  /// El campo `date` viene del backend en formato ISO 8601
  /// (ej. "2026-12-15T00:00:00.000Z") y se convierte a DD/MM/YYYY.
  factory UpcomingEvent.fromJson(Map<String, dynamic> json) {
    final rawDate = json['date'] as String? ?? '';
    String formattedDate = rawDate;

    try {
      final dateTime = DateTime.parse(rawDate);
      final day = dateTime.day.toString().padLeft(2, '0');
      final month = dateTime.month.toString().padLeft(2, '0');
      final year = dateTime.year.toString();
      formattedDate = '$day/$month/$year';
    } catch (_) {
      // Si el formato no es válido, se deja el valor original.
      formattedDate = rawDate;
    }

    return UpcomingEvent(
      id: json['id']?.toString() ?? '',
      title: json['title'] as String? ?? 'Sin título',
      date: formattedDate,
      time: json['time'] as String? ?? '',
      location: json['location'] as String? ?? '',
      description: json['description'] as String? ?? '',
      capacity: (json['capacity'] as num?)?.toInt() ?? 50,
    );
  }

  /// Convierte el modelo a un mapa JSON.
  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'date': date,
        'time': time,
        'location': location,
        'description': description,
        'capacity': capacity,
      };

  @override
  String toString() {
    return 'UpcomingEvent(id: $id, title: $title, date: $date, '
        'time: $time, location: $location)';
  }
}
