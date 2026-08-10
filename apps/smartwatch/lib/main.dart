import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

// URL de la API — configurable en tiempo de compilación con:
//   flutter run --dart-define=API_BASE_URL=https://TU-API.railway.app/api/v1
// Si no se especifica, usa el valor para el emulador local de Android Studio.
const String kApiBase = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api/v1',
);

void main() {
  runApp(const SmartwatchApp());
}

class SmartwatchApp extends StatelessWidget {
  const SmartwatchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Música Más Vida Wear',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFFDF9E14),
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
    return const LoginScreen();
  }
}

// ==============================
// MODELO: Evento próximo
// ==============================
class UpcomingEvent {
  final String id;
  final String title;
  final String date;
  final String time;
  final String location;

  UpcomingEvent({
    required this.id,
    required this.title,
    required this.date,
    required this.time,
    required this.location,
  });

  factory UpcomingEvent.fromJson(Map<String, dynamic> json) {
    // La fecha viene en ISO 8601: "2026-08-15T00:00:00.000Z"
    final rawDate = json['date'] as String;
    final parsedDate = DateTime.tryParse(rawDate);
    final formattedDate = parsedDate != null
        ? '${parsedDate.day}/${parsedDate.month}/${parsedDate.year}'
        : rawDate;

    return UpcomingEvent(
      id: json['id'] as String,
      title: json['title'] as String,
      date: formattedDate,
      time: json['time'] as String,
      location: json['location'] as String,
    );
  }
}

// ==============================
// PANTALLA DE LOGIN (PIN)
// ==============================
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

  Future<void> login() async {
    if (pin.length != 6) return;

    setState(() {
      isLoading = true;
      errorMessage = "";
    });

    try {
      final response = await http.post(
        Uri.parse("$kApiBase/auth/smartwatch/login"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"pin": pin}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          token = data['accessToken'] as String;
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
        // Auto-login cuando se completan 6 dígitos
        if (pin.length == 6) login();
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

  Widget buildKey(String label, VoidCallback onTap, {Color color = Colors.grey}) {
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
          label,
          style: const TextStyle(
            fontSize: 15,
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Si ya hay token, mostrar el Dashboard con datos reales
    if (token != null) {
      return DashboardScreen(
        token: token!,
        apiBase: kApiBase,
        onLogout: () {
          setState(() {
            token = null;
            pin = "";
          });
        },
      );
    }

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                "Ingresa PIN",
                style: TextStyle(fontSize: 11, color: Colors.white70),
              ),
              const SizedBox(height: 4),
              Text(
                pin.isEmpty ? "------" : pin.padRight(6, '-'),
                style: const TextStyle(
                  fontSize: 22,
                  letterSpacing: 4,
                  color: Color(0xFFDF9E14),
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              if (errorMessage.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    errorMessage,
                    style: const TextStyle(fontSize: 9, color: Colors.redAccent),
                  ),
                ),
              if (isLoading)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFFDF9E14),
                  ),
                )
              else
                Column(
                  children: [
                    _buildRow(["1", "2", "3"]),
                    const SizedBox(height: 4),
                    _buildRow(["4", "5", "6"]),
                    const SizedBox(height: 4),
                    _buildRow(["7", "8", "9"]),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        buildKey("C", deleteNumber, color: Colors.red),
                        const SizedBox(width: 8),
                        buildKey("0", () => appendNumber("0")),
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

  Widget _buildRow(List<String> numbers) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: numbers
          .map((n) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: buildKey(n, () => appendNumber(n)),
              ))
          .toList(),
    );
  }
}

// ==============================
// PANTALLA PRINCIPAL (Dashboard)
// Carga eventos reales de la API
// ==============================
class DashboardScreen extends StatefulWidget {
  final String token;
  final String apiBase;
  final VoidCallback onLogout;

  const DashboardScreen({
    super.key,
    required this.token,
    required this.apiBase,
    required this.onLogout,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<UpcomingEvent> events = [];
  bool isLoading = true;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final response = await http.get(
        Uri.parse("${widget.apiBase}/events/upcoming"),
        headers: {
          "Content-Type": "application/json",
          // El JWT autentica al usuario en caso de que el endpoint requiera auth
          "Authorization": "Bearer ${widget.token}",
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        setState(() {
          events = data.map((e) => UpcomingEvent.fromJson(e)).toList();
          isLoading = false;
        });
      } else {
        setState(() {
          errorMessage = "Error al cargar eventos";
          isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        errorMessage = "Sin conexión";
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.music_note, color: Color(0xFFDF9E14), size: 16),
                SizedBox(width: 4),
                Text(
                  "Próximos Eventos",
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFDF9E14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Contenido
            if (isLoading)
              const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Color(0xFFDF9E14),
                ),
              )
            else if (errorMessage != null)
              Column(
                children: [
                  Text(
                    errorMessage!,
                    style: const TextStyle(fontSize: 10, color: Colors.redAccent),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: _loadEvents,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white10,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        "Reintentar",
                        style: TextStyle(fontSize: 10, color: Colors.white70),
                      ),
                    ),
                  ),
                ],
              )
            else if (events.isEmpty)
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  "No hay eventos\npróximos",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Colors.white54),
                ),
              )
            else
              ...events.map((event) => _EventCard(event: event)).toList(),

            const SizedBox(height: 12),

            // Botón refrescar
            GestureDetector(
              onTap: _loadEvents,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.refresh, size: 12, color: Colors.white54),
                    SizedBox(width: 4),
                    Text(
                      "Actualizar",
                      style: TextStyle(fontSize: 10, color: Colors.white54),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Botón cerrar sesión
            GestureDetector(
              onTap: widget.onLogout,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.logout, size: 12, color: Colors.redAccent),
                    SizedBox(width: 4),
                    Text(
                      "Cerrar sesión",
                      style: TextStyle(fontSize: 10, color: Colors.redAccent),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==============================
// WIDGET: Tarjeta de evento
// ==============================
class _EventCard extends StatelessWidget {
  final UpcomingEvent event;

  const _EventCard({required this.event});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFDF9E14).withOpacity(0.3), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            event.title,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 3),
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 9, color: Color(0xFFDF9E14)),
              const SizedBox(width: 3),
              Text(
                "${event.date}  ${event.time}",
                style: const TextStyle(fontSize: 9, color: Colors.white70),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              const Icon(Icons.location_on, size: 9, color: Colors.white38),
              const SizedBox(width: 3),
              Expanded(
                child: Text(
                  event.location,
                  style: const TextStyle(fontSize: 9, color: Colors.white38),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
