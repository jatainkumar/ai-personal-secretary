import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/upload_response.dart';
import '../models/person.dart';
import '../services/api_repository.dart';

// --- State Models ---

class ChatMessage {
  final String role; // 'user' or 'bot'
  final String text;

  ChatMessage({required this.role, required this.text});
}

// --- Providers ---

final activeTabProvider = StateProvider<String>((ref) => 'chat');
final userIdProvider = StateProvider<String?>((ref) => null);

// Data Providers
final personsProvider = StateProvider<List<Person>>((ref) => []);
final statsProvider = StateProvider<UploadResponse?>((ref) => null);
final filesProvider = StateProvider<List<String>>((ref) => []);

// UI State Providers
final isUploadingProvider = StateProvider<bool>((ref) => false);
final isThinkingProvider = StateProvider<bool>((ref) => false);
final uploadStatusProvider = StateProvider<String?>((ref) => null);

// VCF Enrichment State
final vcfMatchReportProvider = StateProvider<Map<String, dynamic>?>(
  (ref) => null,
);
final vcfTempDirProvider = StateProvider<String?>((ref) => null);

final chatMessagesProvider = StateProvider<List<ChatMessage>>(
  (ref) => [
    ChatMessage(
      role: 'bot',
      text:
          'Hello! Upload your connections CSV, then ask me anything about your network.',
    ),
  ],
);

// Repository Provider
final apiRepositoryProvider = Provider<ApiRepository>((ref) => ApiRepository());
