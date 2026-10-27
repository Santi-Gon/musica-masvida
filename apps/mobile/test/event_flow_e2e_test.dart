import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:musica_masvida_mobile/core/theme/app_theme.dart';
import 'package:musica_masvida_mobile/features/events/providers/event_provider.dart';
import 'package:musica_masvida_mobile/features/events/screens/home_screen.dart';
import 'package:musica_masvida_mobile/features/events/services/event_service.dart';

void main() {
  group('Fase 4 - Prueba E2E Automatizada: Flujo Crítico de Consulta e Interacción de Eventos', () {
    testWidgets(
      'Flujo E2E completo: Carga inicial -> Visualización del catálogo -> Tap en evento -> Navegación a Detalle -> Retorno a Home',
      (WidgetTester tester) async {
        // ---------------------------------------------------------------------
        // PASO 1: Inicialización de la aplicación completa con sus Providers y tema
        // ---------------------------------------------------------------------
        // Usamos EventService real con datos para garantizar un entorno reproducible y estable
        final eventService = EventService(useMock: true);
        final eventProvider = EventProvider(eventService: eventService);

        await tester.pumpWidget(
          ChangeNotifierProvider<EventProvider>.value(
            value: eventProvider,
            child: MaterialApp(
              theme: AppTheme.darkTheme,
              home: const HomeScreen(),
            ),
          ),
        );

        // ---------------------------------------------------------------------
        // PASO 2: Verificación de Estado Inicial (Carga / Feedback visual al usuario)
        // ---------------------------------------------------------------------
        // En el primer frame, HomeScreen debe encontrarse solicitando datos
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        expect(find.text('Cargando eventos...'), findsOneWidget);
        expect(find.text('Próximos Eventos'), findsOneWidget);

        // ---------------------------------------------------------------------
        // PASO 3: Espera a que termine la llamada asíncrona y settle de animaciones
        // ---------------------------------------------------------------------
        await tester.pumpAndSettle();

        // El indicador de carga ya no debe estar presente
        expect(find.byType(CircularProgressIndicator), findsNothing);
        expect(find.text('Cargando eventos...'), findsNothing);

        // ---------------------------------------------------------------------
        // PASO 4: Verificación de Catálogo poblado en pantalla principal
        // ---------------------------------------------------------------------
        // Deben existir las tarjetas con sus títulos correspondientes
        expect(find.text('Concierto de Primavera'), findsOneWidget);
        expect(find.text('Ensayo General - Coro'), findsOneWidget);
        expect(find.text('Masterclass de Guitarra'), findsOneWidget);

        // Verificamos metadatos del primer evento (Fecha, Hora, Ubicación)
        expect(find.text('21'), findsOneWidget); // Día en DateBadge
        expect(find.text('SEP'), findsWidgets); // Mes en DateBadge
        expect(find.text('19:00'), findsOneWidget);
        expect(find.text('Auditorio Principal'), findsOneWidget);

        // ---------------------------------------------------------------------
        // PASO 5: Interacción del usuario: Tap en la primera tarjeta de evento
        // ---------------------------------------------------------------------
        final primerEventoFinder = find.text('Concierto de Primavera');
        expect(primerEventoFinder, findsOneWidget);

        // El usuario hace tap en el evento
        await tester.tap(primerEventoFinder);

        // Esperamos a que la animación de transición de pantalla (Push Route) concluya
        await tester.pumpAndSettle();

        // ---------------------------------------------------------------------
        // PASO 6: Verificación de la pantalla de destino (EventDetailScreen)
        // ---------------------------------------------------------------------
        // 1. Título de la barra de navegación superior
        expect(find.text('Detalle del Evento'), findsOneWidget);

        // 2. Encabezado hero con el nombre del evento
        expect(find.text('Concierto de Primavera'), findsOneWidget);

        // 3. Título de la sección de especificaciones
        expect(find.text('Información del Evento'), findsOneWidget);

        // 4. Datos específicos del evento desplegados en la vista detallada
        expect(find.text('Fecha'), findsOneWidget);
        expect(find.text('21/09/2026'), findsOneWidget);
        expect(find.text('Hora'), findsOneWidget);
        expect(find.text('19:00'), findsOneWidget);
        expect(find.text('Ubicación'), findsOneWidget);
        expect(find.text('Auditorio Principal'), findsOneWidget);

        // 5. Botón de acción para escanear asistencia QR
        expect(find.text('Escanear QR de Asistencia'), findsOneWidget);

        // ---------------------------------------------------------------------
        // PASO 7: Interacción de retorno: Tap en el botón 'Atrás'
        // ---------------------------------------------------------------------
        final backButtonFinder = find.byIcon(Icons.arrow_back_ios_new_rounded);
        expect(backButtonFinder, findsOneWidget);

        await tester.tap(backButtonFinder);
        await tester.pumpAndSettle();

        // ---------------------------------------------------------------------
        // PASO 8: Verificación de Retorno exitoso a la pantalla Home
        // ---------------------------------------------------------------------
        // Comprobamos que el usuario vuelve a ver la pantalla principal con su catálogo intacto
        expect(find.text('Próximos Eventos'), findsOneWidget);
        expect(find.text('Concierto de Primavera'), findsOneWidget);
        expect(find.text('Detalle del Evento'), findsNothing);
      },
    );
  });
}
