import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/screens/qr_login_screen.dart';
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
        ChangeNotifierProvider(create: (_) => EventProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: MaterialApp(
        title: 'Música Más Vida',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        initialRoute: '/splash',
        routes: {
          '/splash': (_) => const SplashScreen(),
          '/login': (_) => const QrLoginScreen(),
          '/home': (_) => const HomeScreen(),
        },
      ),
    );
  }
}
