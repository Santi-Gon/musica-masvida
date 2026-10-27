import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'features/splash/screens/splash_screen.dart';
import 'features/events/screens/home_screen.dart';
import 'features/events/providers/event_provider.dart';

void main() {
  runApp(const MusicaMasVidaApp());
}

/// Punto de entrada de la aplicación Música Más Vida Mobile.
///
/// Registra los providers globales y define las rutas nombradas de la app.
class MusicaMasVidaApp extends StatelessWidget {
  const MusicaMasVidaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Provider de eventos próximos
        ChangeNotifierProvider(create: (_) => EventProvider()),

        // TODO (Lab - QR Scanner): Registrar aquí el provider del escáner QR
        // cuando se integre el paquete mobile_scanner en la práctica de laboratorio.
      ],
      child: MaterialApp(
        title: 'Música Más Vida',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        initialRoute: '/splash',
        routes: {
          '/splash': (_) => const SplashScreen(),
          '/home': (_) => const HomeScreen(),
        },
      ),
    );
  }
}
