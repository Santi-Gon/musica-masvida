/// Constantes globales de la aplicación Música Más Vida Mobile.
class AppConstants {
  AppConstants._();

  // --- API URLs ---

  /// ▶ Para EMULADOR Android (10.0.2.2 = localhost del host PC).
  static const String baseUrlEmulator = 'http://10.0.2.2:3000/api/v1';

  /// ▶ Para CELULAR FÍSICO (misma red WiFi que el PC).
  /// Reemplaza con la IP de tu PC: ejecuta `ipconfig` en PowerShell.
  /// IP actual de tu PC: 192.168.1.111
  static const String baseUrlDevice = 'http://192.168.1.111:3000/api/v1';

  /// 🔧 CAMBIA ESTO según dónde estás probando:
  ///   - [baseUrlEmulator] si usas el emulador Android Studio
  ///   - [baseUrlDevice]   si usas tu celular físico por USB o WiFi
  static const String baseUrl = baseUrlDevice;

  // --- App Info ---
  static const String appName = 'Música Más Vida';
  static const String appTagline = 'Tu escuela de música, siempre contigo';

  // --- Tiempos ---
  static const int splashDurationSeconds = 3;
}
