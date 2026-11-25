enum SupportTicketCategory { appError, loginIssue, eventRegistration, other }

extension SupportTicketCategoryValue on SupportTicketCategory {
  String get apiValue => switch (this) {
    SupportTicketCategory.appError => 'APP_ERROR',
    SupportTicketCategory.loginIssue => 'LOGIN_ISSUE',
    SupportTicketCategory.eventRegistration => 'EVENT_REGISTRATION',
    SupportTicketCategory.other => 'OTRO',
  };
}

class SupportTicketRequest {
  const SupportTicketRequest({
    required this.title,
    required this.description,
    required this.category,
    this.deviceInfo,
  });

  final String title;
  final String description;
  final SupportTicketCategory category;
  final String? deviceInfo;

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'category': category.apiValue,
    if (deviceInfo != null && deviceInfo!.isNotEmpty) 'deviceInfo': deviceInfo,
  };
}

class SupportTicketResponse {
  const SupportTicketResponse({required this.id});

  final String id;

  factory SupportTicketResponse.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    if (id is! String || id.isEmpty) {
      throw const FormatException(
        'La respuesta no incluye un ID de ticket válido.',
      );
    }
    return SupportTicketResponse(id: id);
  }
}
