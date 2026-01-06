import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../providers/app_state.dart';
import 'meeting_modal.dart';

class ChatInterface extends ConsumerStatefulWidget {
  const ChatInterface({super.key});

  @override
  ConsumerState<ChatInterface> createState() => _ChatInterfaceState();
}

class _ChatInterfaceState extends ConsumerState<ChatInterface> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    _controller.clear();
    ref
        .read(chatMessagesProvider.notifier)
        .update((state) => [...state, ChatMessage(role: 'user', text: text)]);

    // Scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });

    ref.read(isThinkingProvider.notifier).state = true;

    try {
      final repo = ref.read(apiRepositoryProvider);
      final userId = ref.read(userIdProvider);

      if (userId == null) {
        throw Exception("User ID not found (Not logged in)");
      }

      final response = await repo.chat(text, userId);

      ref
          .read(chatMessagesProvider.notifier)
          .update(
            (state) => [
              ...state,
              ChatMessage(role: 'bot', text: response.response),
            ],
          );

      // Handle Meeting Intent
      if (response.intent == 'schedule_meeting_confirm' &&
          response.meetingDetails != null &&
          mounted) {
        showDialog(
          context: context,
          builder: (context) => MeetingModal(
            meetingDetails: response.meetingDetails!,
            onConfirm: () async {
              Navigator.pop(context);
              try {
                ref.read(isThinkingProvider.notifier).state = true;
                final res = await repo.confirmMeeting(response.meetingDetails!);
                ref
                    .read(chatMessagesProvider.notifier)
                    .update(
                      (s) => [
                        ...s,
                        ChatMessage(
                          role: 'bot',
                          text: "✅ Meeting scheduled! ${res['link'] ?? ''}",
                        ),
                      ],
                    );
              } catch (e) {
                ref
                    .read(chatMessagesProvider.notifier)
                    .update(
                      (s) => [
                        ...s,
                        ChatMessage(
                          role: 'bot',
                          text: "❌ Failed to schedule: $e",
                        ),
                      ],
                    );
              } finally {
                ref.read(isThinkingProvider.notifier).state = false;
              }
            },
            onCancel: () {
              Navigator.pop(context);
              ref
                  .read(chatMessagesProvider.notifier)
                  .update(
                    (s) => [
                      ...s,
                      ChatMessage(
                        role: 'bot',
                        text: "Meeting scheduling canceled.",
                      ),
                    ],
                  );
            },
          ),
        );
      }
    } catch (e) {
      ref
          .read(chatMessagesProvider.notifier)
          .update(
            (state) => [
              ...state,
              ChatMessage(role: 'bot', text: "Error connecting to AI: $e"),
            ],
          );
    } finally {
      ref.read(isThinkingProvider.notifier).state = false;
      // Scroll to bottom again
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(chatMessagesProvider);
    final isThinking = ref.watch(isThinkingProvider);

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
          ),
          child: Row(
            children: [
              const Icon(
                LucideIcons.messageSquare,
                color: Color(0xFF2563EB),
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'AI Assistant',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),

        // Messages
        Expanded(
          child: Container(
            color: const Color(0xFFF9FAFB), // gray-50
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(24),
              itemCount: messages.length + (isThinking ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == messages.length) {
                  return _ThinkingBubble();
                }
                final msg = messages[index];
                return _MessageBubble(message: msg);
              },
            ),
          ),
        ),

        // Input
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Colors.grey[200]!)),
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 896), // max-w-4xl
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: InputDecoration(
                        hintText: "Ask something...",
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: BorderSide(color: Colors.grey[300]!),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(
                            color: Color(0xFF2563EB),
                            width: 2,
                          ),
                        ),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: _sendMessage,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        LucideIcons.send,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: Color(0xFF16A34A), // green-600
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.bot, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 12),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(16),
              constraints: const BoxConstraints(maxWidth: 672), // max-w-2xl
              decoration: BoxDecoration(
                color: isUser ? const Color(0xFF2563EB) : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: isUser ? null : Border.all(color: Colors.grey[100]!),
                boxShadow: isUser
                    ? []
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 2,
                        ),
                      ],
              ),
              child: isUser
                  ? Text(
                      message.text,
                      style: const TextStyle(color: Colors.white),
                    )
                  : MarkdownBody(data: message.text),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 12),
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: Color(0xFF2563EB),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                LucideIcons.user,
                color: Colors.white,
                size: 16,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ThinkingBubble extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[100]!),
            ),
            child: Row(
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 8),
                Text("Thinking...", style: TextStyle(color: Colors.grey[500])),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
