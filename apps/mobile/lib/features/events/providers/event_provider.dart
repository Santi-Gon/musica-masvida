import 'package:flutter/material.dart';
import '../models/upcoming_event.dart';
import '../services/event_service.dart';

/// Estado posible del provider de eventos.
enum EventStatus { initial, loading, loaded, error }

/// Provider de eventos próximos. Maneja estado de carga, errores y datos.
///
/// Consume [EventService] para obtener los datos de la API REST.
/// Usar con [ChangeNotifierProvider] en el árbol de widgets.
class EventProvider extends ChangeNotifier {
  final EventService _eventService;

  EventProvider({EventService? eventService})
      : _eventService = eventService ?? EventService();

  // --- Estado ---
  EventStatus _status = EventStatus.initial;
  List<UpcomingEvent> _events = [];
  String _errorMessage = '';

  // --- Getters ---
  EventStatus get status => _status;
  List<UpcomingEvent> get events => List.unmodifiable(_events);
  String get errorMessage => _errorMessage;

  /// Conveniencia: true mientras los datos se están cargando.
  bool get isLoading => _status == EventStatus.loading;

  /// Conveniencia: true si se produjo un error.
  bool get hasError => _status == EventStatus.error;

  /// Conveniencia: true si los datos están disponibles.
  bool get hasData => _status == EventStatus.loaded && _events.isNotEmpty;

  // --- Acciones ---

  /// Carga los próximos eventos desde la API.
  /// Notifica a los listeners en cada cambio de estado.
  Future<void> fetchUpcomingEvents() async {
    if (_status == EventStatus.loading) return;

    _status = EventStatus.loading;
    _errorMessage = '';
    notifyListeners();

    try {
      _events = await _eventService.getUpcomingEvents();
      _status = EventStatus.loaded;
    } catch (e) {
      _status = EventStatus.error;
      _errorMessage = _parseError(e);
    } finally {
      notifyListeners();
    }
  }

  /// Permite refrescar los datos limpiando el estado anterior.
  Future<void> refresh() async {
    _events = [];
    await fetchUpcomingEvents();
  }

  String _parseError(Object e) {
    final raw = e.toString();
    if (raw.contains('SocketException') ||
        raw.contains('Connection refused') ||
        raw.contains('Failed host lookup')) {
      return 'No se pudo conectar al servidor.\nVerifica que la API esté corriendo.';
    }
    if (raw.contains('TimeoutException')) {
      return 'La solicitud tardó demasiado. Intenta de nuevo.';
    }
    return 'Ocurrió un error inesperado.\n$raw';
  }
}
