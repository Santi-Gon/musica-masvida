import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/support_ticket.dart';
import '../services/support_service.dart';

class SupportChatbotSheet extends StatefulWidget {
  const SupportChatbotSheet({super.key});

  @override
  State<SupportChatbotSheet> createState() => _SupportChatbotSheetState();
}

class _SupportChatbotSheetState extends State<SupportChatbotSheet> {
  final _descriptionController = TextEditingController();
  final _service = SupportService();
  SupportTicketCategory? _category;
  bool _isSubmitting = false;
  String? _error;
  String? _ticketId;

  static const _categories =
      <({String label, SupportTicketCategory value, IconData icon})>[
        (
          label: 'Fallo con escáner QR',
          value: SupportTicketCategory.loginIssue,
          icon: Icons.qr_code_scanner_rounded,
        ),
        (
          label: 'Error al inscribirme',
          value: SupportTicketCategory.eventRegistration,
          icon: Icons.event_busy_rounded,
        ),
        (
          label: 'App lenta / se cierra',
          value: SupportTicketCategory.appError,
          icon: Icons.phone_android_rounded,
        ),
        (
          label: 'Otro',
          value: SupportTicketCategory.other,
          icon: Icons.help_outline_rounded,
        ),
      ];

  @override
  void dispose() {
    _descriptionController.dispose();
    _service.close();
    super.dispose();
  }

  Future<void> _submit() async {
    final description = _descriptionController.text.trim();
    final category = _category;
    if (category == null || description.isEmpty || _isSubmitting) return;

    final token = context.read<AuthProvider>().token;
    if (token == null || token.isEmpty) {
      setState(
        () => _error = 'Tu sesión no está activa. Inicia sesión de nuevo.',
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final selected = _categories.firstWhere((item) => item.value == category);
      final response = await _service.submitTicket(
        ticket: SupportTicketRequest(
          title: selected.label,
          description: description,
          category: category,
        ),
        token: token,
      );
      if (mounted) setState(() => _ticketId = response.id);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottomInset),
        child: SingleChildScrollView(
          child: _ticketId == null
              ? _buildConversation()
              : _buildConfirmation(),
        ),
      ),
    );
  }

  Widget _buildConversation() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
          child: Container(
            width: 42,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.textMuted,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            const CircleAvatar(
              backgroundColor: AppTheme.primaryGold,
              child: Icon(Icons.support_agent_rounded, color: Colors.black),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Asistente de soporte',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const Text(
                    'Hola, ¿en qué podemos ayudarte?',
                    style: TextStyle(color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Cerrar',
              onPressed: _isSubmitting
                  ? null
                  : () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close_rounded),
            ),
          ],
        ),
        const SizedBox(height: 22),
        const Text(
          'Selecciona el tema del reporte',
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _categories.map((item) {
            final selected = _category == item.value;
            return ChoiceChip(
              avatar: Icon(
                item.icon,
                size: 17,
                color: selected ? Colors.black : AppTheme.primaryGold,
              ),
              label: Text(item.label),
              selected: selected,
              onSelected: _isSubmitting
                  ? null
                  : (_) => setState(() {
                      _category = item.value;
                      _error = null;
                    }),
              selectedColor: AppTheme.primaryGold,
              backgroundColor: AppTheme.cardDark,
              labelStyle: TextStyle(
                color: selected ? Colors.black : AppTheme.textPrimary,
              ),
              side: BorderSide(
                color: selected ? AppTheme.primaryGold : AppTheme.dividerDark,
              ),
            );
          }).toList(),
        ),
        if (_category != null) ...[
          const SizedBox(height: 20),
          const Text(
            'Cuéntanos brevemente qué ocurrió',
            style: TextStyle(
              color: AppTheme.textPrimary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _descriptionController,
            onChanged: (_) => setState(() {}),
            minLines: 3,
            maxLines: 5,
            maxLength: 2000,
            enabled: !_isSubmitting,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              hintText: 'Describe el problema para que podamos ayudarte...',
              filled: true,
              fillColor: AppTheme.cardDark,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.primaryGold),
              ),
            ),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: Colors.redAccent)),
        ],
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed:
                _category == null ||
                    _descriptionController.text.trim().isEmpty ||
                    _isSubmitting
                ? null
                : _submit,
            icon: _isSubmitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send_rounded),
            label: Text(
              _isSubmitting ? 'Enviando reporte...' : 'Enviar reporte',
            ),
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildConfirmation() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.check_circle_rounded,
            color: AppTheme.primaryGold,
            size: 60,
          ),
          const SizedBox(height: 16),
          Text(
            '¡Ticket registrado con éxito!',
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'Nuestro equipo revisará tu reporte.',
            style: TextStyle(color: AppTheme.textSecondary),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          SelectableText(
            'Ticket: $_ticketId',
            style: const TextStyle(
              color: AppTheme.primaryGold,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Listo'),
            ),
          ),
        ],
      ),
    );
  }
}
