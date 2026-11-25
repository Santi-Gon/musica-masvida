import 'package:flutter/material.dart';

/// Tema oscuro premium para Música Más Vida.
/// Color primario: Dorado #DF9E14
class AppTheme {
  AppTheme._();

  static const Color primaryGold = Color(0xFFDF9E14);
  static const Color primaryGoldLight = Color(0xFFFFBF3C);
  static const Color primaryGoldDark = Color(0xFFAA7A00);

  static const Color backgroundDark = Color(0xFF0D0D0D);
  static const Color surfaceDark = Color(0xFF1A1A1A);
  static const Color cardDark = Color(0xFF242424);
  static const Color dividerDark = Color(0xFF2E2E2E);

  static const Color textPrimary = Color(0xFFF5F5F5);
  static const Color textSecondary = Color(0xFFB0B0B0);
  static const Color textMuted = Color(0xFF6B6B6B);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark(
        primary: primaryGold,
        onPrimary: Colors.black,
        secondary: primaryGoldLight,
        onSecondary: Colors.black,
        surface: surfaceDark,
        onSurface: textPrimary,
        error: const Color(0xFFCF6679),
      ),
      scaffoldBackgroundColor: backgroundDark,
      appBarTheme: const AppBarTheme(
        backgroundColor: surfaceDark,
        foregroundColor: primaryGold,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: primaryGold,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
        iconTheme: IconThemeData(color: primaryGold),
      ),
      cardTheme: CardThemeData(
        color: cardDark,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: dividerDark, width: 1),
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: primaryGold,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          color: textPrimary,
          fontSize: 32,
          fontWeight: FontWeight.w800,
        ),
        headlineMedium: TextStyle(
          color: textPrimary,
          fontSize: 24,
          fontWeight: FontWeight.w700,
        ),
        titleLarge: TextStyle(
          color: textPrimary,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
        titleMedium: TextStyle(
          color: textPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: TextStyle(color: textPrimary, fontSize: 16),
        bodyMedium: TextStyle(color: textSecondary, fontSize: 14),
        bodySmall: TextStyle(color: textMuted, fontSize: 12),
        labelLarge: TextStyle(
          color: primaryGold,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.5,
        ),
      ),
      dividerTheme: const DividerThemeData(color: dividerDark, thickness: 1),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryGold,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      iconTheme: const IconThemeData(color: primaryGold),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: cardDark,
        contentTextStyle: const TextStyle(color: textPrimary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
