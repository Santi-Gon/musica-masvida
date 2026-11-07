import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

class QrLoginScreen extends StatefulWidget {
  const QrLoginScreen({super.key});

  @override
  State<QrLoginScreen> createState() => _QrLoginScreenState();
}

class _QrLoginScreenState extends State<QrLoginScreen> {
  bool _processingCode = false;

  Future<void> _handleDetection(BarcodeCapture capture) async {
    if (_processingCode || capture.barcodes.isEmpty) return;
    final code = capture.barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() => _processingCode = true);
    try {
      await context.read<AuthProvider>().loginWithQr(code);
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/home', (_) => false);
      }
    } catch (_) {
      if (mounted) setState(() => _processingCode = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Iniciar sesión')),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                MobileScanner(onDetect: _handleDetection),
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white, width: 3),
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
                if (_processingCode)
                  const ColoredBox(
                    color: Color(0x88000000),
                    child: Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const Text(
                  'En el portal web, genera tu QR e introdúcelo en el recuadro.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Consumer<AuthProvider>(
                  builder: (context, provider, _) => provider.errorMessage == null
                      ? const SizedBox.shrink()
                      : Text(
                          provider.errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.redAccent),
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
