/// Constantes globales de la aplicación Música Más Vida Mobile.
class AppConstants {
  AppConstants._();

  // --- API URLs ---

  /// ▶ Para EMULADOR Android (10.0.2.2 = localhost del host PC).
  static const String baseUrlEmulator = 'http://10.0.2.2:3000/api/v1';

  /// ▶ Para CELULAR FÍSICO (misma red WiFi que el PC).
  /// Ejecuta `ipconfig` y pásala con --dart-define=API_BASE_URL=http://ip-local:3000/api/v1.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: baseUrlEmulator,
  );

  // --- App Info ---
  static const String appName = 'Música Más Vida';
  static const String appTagline = 'Tu escuela de música, siempre contigo';

  // --- Tiempos ---
  static const int splashDurationSeconds = 3;
}
