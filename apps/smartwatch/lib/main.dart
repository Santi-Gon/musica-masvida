import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:wear/wear.dart';

void main() {
  runApp(const SmartwatchApp());
}

class SmartwatchApp extends StatelessWidget {
  const SmartwatchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Música Más Vida Wear',
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: Colors.purpleAccent,
        scaffoldBackgroundColor: Colors.black,
        visualDensity: VisualDensity.compact,
      ),
      home: const WatchScreen(),
    );
  }
}

class WatchScreen extends StatelessWidget {
  const WatchScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return WatchShape(
      builder: (context, shape, child) {
        return const LoginScreen();
      },
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String pin = "";
  bool isLoading = false;
  String errorMessage = "";
  String? token;

  // IMPORTANTE: Si usas el emulador de Android Studio, 10.0.2.2 apunta a tu localhost.
  // Si corres en un reloj físico conectado por Wi-Fi/Bluetooth, pon la IP local de tu compu (Ej. 192.168.1.X)
  final String apiUrl = "http://10.0.2.2:3000/api/v1/auth/smartwatch/login";

  Future<void> login() async {
    if (pin.length != 6) return;
    
    setState(() {
      isLoading = true;
      errorMessage = "";
    });

    try {
      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"pin": pin}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          token = data['accessToken'];
        });
      } else {
        setState(() {
          errorMessage = "PIN incorrecto o expirado";
          pin = "";
        });
      }
    } catch (e) {
      setState(() {
        errorMessage = "Error de conexión";
        pin = "";
      });
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  void appendNumber(String num) {
    if (pin.length < 6) {
      setState(() {
        pin += num;
        errorMessage = "";
      });
    }
  }

  void deleteNumber() {
    if (pin.isNotEmpty) {
      setState(() {
        pin = pin.substring(0, pin.length - 1);
      });
    }
  }

  Widget buildKey(String num, VoidCallback onTap, {Color color = Colors.grey}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: color.withOpacity(0.3),
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: Text(
          num,
          style: const TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Si ya logueó, mostramos el Dashboard
    if (token != null) {
      return DashboardScreen(onLogout: () {
        setState(() {
          token = null;
          pin = "";
        });
      });
    }

    // Pantalla de Login (Teclado numérico)
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text("Ingresa PIN", style: TextStyle(fontSize: 12, color: Colors.white70)),
              const SizedBox(height: 4),
              Text(
                pin.isEmpty ? "------" : pin.padRight(6, '-'),
                style: const TextStyle(fontSize: 24, letterSpacing: 4, color: Colors.cyanAccent, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              if (errorMessage.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(errorMessage, style: const TextStyle(fontSize: 10, color: Colors.redAccent)),
                ),
              if (isLoading)
                const CircularProgressIndicator(strokeWidth: 2)
              else
                Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        buildKey("1", () => appendNumber("1")),
                        const SizedBox(width: 8),
                        buildKey("2", () => appendNumber("2")),
                        const SizedBox(width: 8),
                        buildKey("3", () => appendNumber("3")),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        buildKey("4", () => appendNumber("4")),
                        const SizedBox(width: 8),
                        buildKey("5", () => appendNumber("5")),
                        const SizedBox(width: 8),
                        buildKey("6", () => appendNumber("6")),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        buildKey("7", () => appendNumber("7")),
                        const SizedBox(width: 8),
                        buildKey("8", () => appendNumber("8")),
                        const SizedBox(width: 8),
                        buildKey("9", () => appendNumber("9")),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        buildKey("C", deleteNumber, color: Colors.red),
                        const SizedBox(width: 8),
                        buildKey("0", () => appendNumber("0")),
                        const SizedBox(width: 8),
                        buildKey("OK", login, color: pin.length == 6 ? Colors.green : Colors.grey),
                      ],
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  final VoidCallback onLogout;

  const DashboardScreen({super.key, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 32),
              const SizedBox(height: 8),
              const Text("¡Bienvenido!", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(8)),
                child: const Column(
                  children: [
                    Text("💊 Recordatorio Médico", style: TextStyle(fontSize: 10, color: Colors.white70)),
                    Text("Tomar pastilla a las 08:00 AM", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(8)),
                child: const Column(
                  children: [
                    Text("🏃 Actividad Física", style: TextStyle(fontSize: 10, color: Colors.white70)),
                    Text("Caminata (30 min)", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: onLogout,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.redAccent,
                  minimumSize: const Size(80, 24),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                ),
                child: const Text("Salir", style: TextStyle(fontSize: 10, color: Colors.white)),
              )
            ],
          ),
        ),
      ),
    );
  }
}
