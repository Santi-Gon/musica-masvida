import 'package:flutter/material.dart';
import 'package:add_2_calendar/add_2_calendar.dart' as calendar;
import 'package:provider/provider.dart';

import '../../auth/providers/auth_provider.dart';
import '../models/upcoming_event.dart';
import '../providers/event_provider.dart';
import '../services/event_service.dart';
import '../../../core/theme/app_theme.dart';

/// Pantalla de detalle de un evento.
///
/// Recibe un [UpcomingEvent] y muestra todos sus datos de forma destacada.
/// Navegación: se accede desde [HomeScreen] tocando una tarjeta de evento.
class EventDetailScreen extends StatefulWidget {
  final UpcomingEvent event;

  const EventDetailScreen({super.key, required this.event});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  bool? _isRegistered;
  bool _isRegistering = false;
  bool _isAddingToCalendar = false;
  String? _registrationError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _loadRegistrationStatus(),
    );
  }

  Future<void> _loadRegistrationStatus() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    try {
      final registered = await context.read<EventProvider>().isRegistered(
        widget.event.id,
        token,
      );
      if (mounted) setState(() => _isRegistered = registered);
    } catch (error) {
      if (mounted) {
        setState(() {
          // No asumir "no inscrito" ante un fallo de red/servidor.
          _isRegistered = null;
          _registrationError = error.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  Future<void> _register() async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;

    setState(() {
      _isRegistering = true;
      _registrationError = null;
    });
    try {
      await context.read<EventProvider>().registerForEvent(
        widget.event.id,
        token,
      );
      if (mounted) setState(() => _isRegistered = true);
    } catch (error) {
      if (mounted) {
        setState(() {
          if (error is AlreadyRegisteredException) {
            // El servidor ya tenía la inscripción; mostrar estado confirmado.
            _isRegistered = true;
            _registrationError = null;
          } else {
            _registrationError = error.toString().replaceFirst(
              'Exception: ',
              '',
            );
          }
        });
      }
    } finally {
      if (mounted) setState(() => _isRegistering = false);
    }
  }

  DateTime _eventStartDate() {
    final dateParts = widget.event.date.split('/');
    if (dateParts.length != 3) {
      throw const FormatException(
        'La fecha del evento no tiene un formato válido.',
      );
    }

    final day = int.tryParse(dateParts[0]);
    final month = int.tryParse(dateParts[1]);
    final year = int.tryParse(dateParts[2]);
    if (day == null || month == null || year == null) {
      throw const FormatException(
        'La fecha del evento no tiene un formato válido.',
      );
    }

    final timeMatch = RegExp(r'^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$')
        .firstMatch(widget.event.time.trim());
    if (timeMatch == null) {
      throw const FormatException(
        'La hora del evento no tiene un formato válido.',
      );
    }

    var hour = int.parse(timeMatch.group(1)!);
    final minute = int.parse(timeMatch.group(2)!);
    final meridiem = timeMatch.group(3)?.toUpperCase();
    if (minute > 59 ||
        (meridiem == null ? hour > 23 : (hour < 1 || hour > 12))) {
      throw const FormatException(
        'La hora del evento no tiene un formato válido.',
      );
    }
    if (meridiem != null) {
      if (meridiem == 'PM' && hour != 12) hour += 12;
      if (meridiem == 'AM' && hour == 12) hour = 0;
    }

    final start = DateTime(year, month, day, hour, minute);
    if (start.year != year || start.month != month || start.day != day) {
      throw const FormatException('La fecha del evento no existe.');
    }
    return start;
  }

  Future<void> _addToCalendar() async {
    if (_isAddingToCalendar) return;
    setState(() => _isAddingToCalendar = true);
    try {
      final startDate = _eventStartDate();
      final event = calendar.Event(
        title: widget.event.title,
        description: widget.event.description,
        location: widget.event.location,
        startDate: startDate,
        endDate: startDate.add(const Duration(hours: 1)),
      );
      final added = await calendar.Add2Calendar.addEvent2Cal(event);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            added
                ? 'Evento agregado al calendario.'
                : 'No se agregó el evento al calendario.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      final message = error is FormatException
          ? error.message
          : 'No se pudo abrir el calendario. Intenta de nuevo.';
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) setState(() => _isAddingToCalendar = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Detalle del Evento'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header con fondo degradado dorado
            _EventHeroHeader(title: event.title),

            // Sección de detalles
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Información del Evento',
                    style: TextStyle(
                      color: AppTheme.primaryGold,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Tarjeta de detalles
                  Container(
                    decoration: BoxDecoration(
                      color: AppTheme.cardDark,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.dividerDark, width: 1),
                    ),
                    child: Column(
                      children: [
                        _DetailRow(
                          icon: Icons.calendar_month_rounded,
                          label: 'Fecha',
                          value: event.date,
                          isFirst: true,
                        ),
                        const Divider(height: 1, color: AppTheme.dividerDark),
                        _DetailRow(
                          icon: Icons.access_time_rounded,
                          label: 'Hora',
                          value: event.time,
                        ),
                        const Divider(height: 1, color: AppTheme.dividerDark),
                        _DetailRow(
                          icon: Icons.location_on_rounded,
                          label: 'Ubicación',
                          value: event.location,
                          isLast: true,
                        ),
                        const Divider(height: 1, color: AppTheme.dividerDark),
                        _DetailRow(
                          icon: Icons.people_alt_rounded,
                          label: 'Cupo máximo',
                          value: '${event.capacity} personas',
                          isLast: true,
                        ),
                      ],
                    ),
                  ),

                  if (event.description.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Text(
                      'Descripción',
                      style: TextStyle(
                        color: AppTheme.primaryGold,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      event.description,
                      style: const TextStyle(color: AppTheme.textSecondary),
                    ),
                  ],
                  const SizedBox(height: 32),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isRegistering || _isRegistered == true
                          ? null
                          : _register,
                      icon: Icon(
                        _isRegistered == true
                            ? Icons.check_circle_outline_rounded
                            : Icons.event_available_rounded,
                      ),
                      label: Text(
                        _isRegistering
                            ? 'Inscribiendo...'
                            : _isRegistered == true
                            ? 'Ya estás inscrito'
                            : 'Inscribirme al evento',
                      ),
                    ),
                  ),
                  if (_isRegistered == true) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _isAddingToCalendar ? null : _addToCalendar,
                        icon: _isAddingToCalendar
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.calendar_month_rounded),
                        label: Text(
                          _isAddingToCalendar
                              ? 'Abriendo calendario...'
                              : '📅 Agregar al Calendario',
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.cardDark,
                          foregroundColor: AppTheme.primaryGold,
                          side: const BorderSide(color: AppTheme.primaryGold),
                        ),
                      ),
                    ),
                  ],
                  if (_registrationError != null) ...[
                    const SizedBox(height: 12),
                    Center(
                      child: Text(
                        _registrationError!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Header hero con gradiente
// ---------------------------------------------------------------------------

class _EventHeroHeader extends StatelessWidget {
  final String title;
  const _EventHeroHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.surfaceDark, Color(0xFF1E1A0A)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ícono musical
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryGold.withValues(alpha: 0.15),
                border: Border.all(
                  color: AppTheme.primaryGold.withValues(alpha: 0.4),
                  width: 1.5,
                ),
              ),
              child: const Icon(
                Icons.event_rounded,
                color: AppTheme.primaryGold,
                size: 30,
              ),
            ),
            const SizedBox(height: 16),

            // Título del evento
            Text(
              title,
              style: const TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 26,
                fontWeight: FontWeight.w800,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fila de detalle reutilizable
// ---------------------------------------------------------------------------

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isFirst;
  final bool isLast;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.isFirst = false,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    BorderRadius? radius;
    if (isFirst && isLast) {
      radius = BorderRadius.circular(20);
    } else if (isFirst) {
      radius = const BorderRadius.only(
        topLeft: Radius.circular(20),
        topRight: Radius.circular(20),
      );
    } else if (isLast) {
      radius = const BorderRadius.only(
        bottomLeft: Radius.circular(20),
        bottomRight: Radius.circular(20),
      );
    }

    return ClipRRect(
      borderRadius: radius ?? BorderRadius.zero,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppTheme.primaryGold.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppTheme.primaryGold, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    value.isNotEmpty ? value : 'No disponible',
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
