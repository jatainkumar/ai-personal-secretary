import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../utils/app_theme.dart';

class Background3D extends StatelessWidget {
  const Background3D({super.key});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Base dark background
        Container(color: AppTheme.darkBg),

        // Animated stars/particles
        ...List.generate(50, (index) {
          final random = Random(index);
          return Positioned(
            left: random.nextDouble() * MediaQuery.of(context).size.width,
            top: random.nextDouble() * MediaQuery.of(context).size.height,
            child:
                Container(
                      width: random.nextDouble() * 3,
                      height: random.nextDouble() * 3,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    )
                    .animate(
                      onPlay: (controller) => controller.repeat(reverse: true),
                    )
                    .fade(
                      duration: Duration(
                        milliseconds: 1000 + random.nextInt(2000),
                      ),
                      begin: 0.2,
                      end: 0.8,
                    )
                    .scale(
                      duration: Duration(
                        milliseconds: 2000 + random.nextInt(2000),
                      ),
                      begin: const Offset(1, 1),
                      end: const Offset(1.5, 1.5),
                    ),
          );
        }),

        // Gradient overlay
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [
                AppTheme.darkBg,
                AppTheme.darkBg.withValues(alpha: 0.1),
                Colors.transparent,
              ],
            ),
          ),
        ),
      ],
    );
  }
}
