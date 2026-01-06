import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // Changed to Riverpod
import 'package:google_fonts/google_fonts.dart'; // Explicit import if needed for Theme extension
import '../utils/app_theme.dart';
import '../widgets/glass_panel.dart';
import '../widgets/background_3d.dart';
import '../providers/app_state.dart'; // For userIdProvider

class LoginScreen extends ConsumerStatefulWidget {
  // Changed to ConsumerStatefulWidget
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final TextEditingController _controller = TextEditingController();

  void _handleLogin() {
    final userId = _controller.text.trim();
    if (userId.isNotEmpty) {
      // Use Riverpod to set state
      ref.read(userIdProvider.notifier).state = userId;
      // Navigation is handled by Main wrapper or explicitly here?
      // Main.dart will switch if it watches the provider.
      // If Main.dart structure is just `home: HomeScreen()`, we might need to pushReplacement or rely on a wrapper.
      // Current Main.dart is just Home. We will change Main.dart next.
      // So setting the state is enough IF Main re-renders.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const Background3D(),
          Center(
            child: GlassPanel(
              margin: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.auto_awesome,
                      size: 60,
                      color: AppTheme.primary,
                    ).animate().scale(duration: 600.ms, curve: Curves.easeOut),
                    const SizedBox(height: 24),
                    Text(
                      'AI Career Secretary',
                      style: GoogleFonts.inter(
                        // Using GoogleFonts directly or Theme
                        fontSize:
                            24, // Guessing size based on previous headlineMedium
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ).animate().fadeIn().moveY(begin: 10),
                    const SizedBox(height: 8),
                    Text(
                      'Professional Multi-User Intelligence',
                      style: TextStyle(color: Colors.grey[400]),
                    ).animate().fadeIn(delay: 200.ms),
                    const SizedBox(height: 32),
                    TextField(
                      controller: _controller,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.black26,
                        hintText: 'Enter Workspace ID / Username',
                        hintStyle: TextStyle(color: Colors.grey[500]),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.all(16),
                      ),
                      onSubmitted: (_) => _handleLogin(),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Enter Workspace'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
