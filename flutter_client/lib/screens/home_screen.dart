import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/app_state.dart';
import '../widgets/sidebar.dart';
import '../widgets/chat_interface.dart';
import 'contacts_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch active tab to switch views
    final activeTab = ref.watch(activeTabProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // gray-50
      body: Row(
        children: [
          // Sidebar handles navigation state changes
          const Sidebar(),

          // Main Content Area
          Expanded(
            child: activeTab == 'contacts'
                ? const ContactsScreen()
                : const ChatInterface(), // Default to Chat if not connections?
            // Wait, logic in sidebar might vary. Let's align with Vite:
            // Vite has 'chat' and 'contacts'.
            // In AppState, default is 'connections' (which implies Contacts? or Graph?)
            // Looking at Vite App.jsx: default activeTab='chat'.
            // Let's check AppState again.
          ),
        ],
      ),
    );
  }
}
