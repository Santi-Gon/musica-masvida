import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/event_provider.dart';
import '../models/upcoming_event.dart';
import '../../../core/theme/app_theme.dart';
import 'event_detail_screen.dart';

/// Pantalla principal de la aplicación.
///
/// Muestra el listado de próximos eventos usando [EventProvider].
/// - Estado loading: [CircularProgressIndicator] dorado.
/// - Estado error: mensaje con botón de reintento.
/// - Estado cargado: lista de tarjetas de eventos.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Cargar eventos al iniciar la pantalla (post-frame para evitar setState en build).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EventProvider>().fetchUpcomingEvents();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      appBar: AppBar(
        title: const Text('Próximos Eventos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refrescar',
            onPressed: () => context.read<EventProvider>().refresh(),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Cerrar sesión',
            onPressed: () {
              context.read<AuthProvider>().logout();
              Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
            },
          ),
        ],
      ),
      body: Consumer<EventProvider>(
        builder: (context, provider, child) {
          return switch (provider.status) {
            EventStatus.initial || EventStatus.loading => _buildLoading(),
            EventStatus.error => _buildError(provider),
            EventStatus.loaded => provider.events.isEmpty
                ? _buildEmpty()
                : _buildEventList(provider.events),
          };
        },
      ),
    );
  }

  // --- Builders de estado ---

  Widget _buildLoading() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryGold),
          ),
          SizedBox(height: 16),
          Text(
            'Cargando eventos...',
            style: TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildError(EventProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.wifi_off_rounded,
              color: AppTheme.primaryGoldDark,
              size: 56,
            ),
            const SizedBox(height: 16),
            const Text(
              'Sin conexión',
              style: TextStyle(
                color: AppTheme.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              provider.errorMessage,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppTheme.textSecondary,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: provider.refresh,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Intentar de nuevo'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.event_busy_rounded,
            color: AppTheme.textMuted,
            size: 56,
          ),
          SizedBox(height: 16),
          Text(
            'No hay eventos próximos',
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildEventList(List<UpcomingEvent> events) {
    return RefreshIndicator(
      color: AppTheme.primaryGold,
      backgroundColor: AppTheme.surfaceDark,
      onRefresh: () => context.read<EventProvider>().refresh(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        itemCount: events.length,
        itemBuilder: (context, index) {
          return _EventCard(
            event: events[index],
            onTap: () => _navigateToDetail(events[index]),
          );
        },
      ),
    );
  }

  void _navigateToDetail(UpcomingEvent event) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => EventDetailScreen(event: event),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Widget interno: tarjeta de evento
// ---------------------------------------------------------------------------

class _EventCard extends StatelessWidget {
  final UpcomingEvent event;
  final VoidCallback onTap;

  const _EventCard({required this.event, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Material(
        color: AppTheme.cardDark,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          splashColor: AppTheme.primaryGold.withValues(alpha: 0.1),
          highlightColor: AppTheme.primaryGold.withValues(alpha: 0.05),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.dividerDark,
                width: 1,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badge de fecha
                  _DateBadge(date: event.date),
                  const SizedBox(width: 16),

                  // Información del evento
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          event.title,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _InfoRow(
                          icon: Icons.access_time_rounded,
                          text: event.time,
                        ),
                        const SizedBox(height: 4),
                        _InfoRow(
                          icon: Icons.location_on_rounded,
                          text: event.location,
                        ),
                      ],
                    ),
                  ),

                  // Flecha indicadora
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppTheme.primaryGold,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DateBadge extends StatelessWidget {
  final String date;
  const _DateBadge({required this.date});

  @override
  Widget build(BuildContext context) {
    // Extraer día y mes del formato DD/MM/YYYY
    final parts = date.split('/');
    final day = parts.isNotEmpty ? parts[0] : '--';
    final month = parts.length > 1 ? _monthAbbr(parts[1]) : '---';

    return Container(
      width: 52,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.primaryGold.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryGold.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            day,
            style: const TextStyle(
              color: AppTheme.primaryGold,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            month,
            style: const TextStyle(
              color: AppTheme.primaryGoldLight,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  String _monthAbbr(String monthStr) {
    const months = [
      'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
      'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
    ];
    final idx = int.tryParse(monthStr);
    if (idx == null || idx < 1 || idx > 12) return '---';
    return months[idx - 1];
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryGold, size: 14),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 13,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
