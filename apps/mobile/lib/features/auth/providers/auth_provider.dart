import 'package:flutter/foundation.dart';

import '../services/mobile_auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final MobileAuthService _authService;

  AuthProvider({MobileAuthService? authService, String? initialToken})
      : _authService = authService ?? MobileAuthService(),
        _token = initialToken;

  String? _token;
  bool _isLoading = false;
  String? _errorMessage;

  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null;
  String? get errorMessage => _errorMessage;

  Future<void> loginWithQr(String code) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _token = await _authService.loginWithQr(code);
    } catch (error) {
      _errorMessage = error.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void logout() {
    _token = null;
    _errorMessage = null;
    notifyListeners();
  }
}
