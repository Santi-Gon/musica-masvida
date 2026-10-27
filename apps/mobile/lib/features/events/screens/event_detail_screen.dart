import 'package:flutter/material.dart';
import '../models/upcoming_event.dart';
import '../../../core/theme/app_theme.dart';

/// Pantalla de detalle de un evento.
///
/// Recibe un [UpcomingEvent] y muestra todos sus datos de forma destacada.
/// Navegación: se accede desde [HomeScreen] tocando una tarjeta de evento.
class EventDetailScreen extends StatelessWidget {
  final UpcomingEvent event;

  const EventDetailScreen({super.key, required this.event});

  @override
  Widget build(BuildContext context) {
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
                      border: Border.all(
                        color: AppTheme.dividerDark,
                        width: 1,
                      ),
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
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),

                  // TODO (Lab - QR Scanner): Botón para generar/escanear QR
                  // de asistencia al evento. Se activará en la práctica de
                  // laboratorio usando el paquete mobile_scanner.
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      // onPressed: null → inactivo hasta la práctica de lab
                      onPressed: null,
                      icon: const Icon(Icons.qr_code_rounded),
                      label: const Text('Escanear QR de Asistencia'),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(
                          color: AppTheme.dividerDark,
                          width: 1.5,
                        ),
                        disabledForegroundColor:
                            AppTheme.textMuted.withOpacity(0.7),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Center(
                    child: Text(
                      'Función disponible en la práctica de laboratorio',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                      ),
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
                color: AppTheme.primaryGold.withOpacity(0.15),
                border: Border.all(
                  color: AppTheme.primaryGold.withOpacity(0.4),
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
                color: AppTheme.primaryGold.withOpacity(0.1),
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
