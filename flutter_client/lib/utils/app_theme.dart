import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color darkBg = Color(0xFF0F172A); // Slate 900
  static const Color primary = Color(0xFF6366F1); // Indigo 500
  static const Color glassBorder = Color(0x33FFFFFF); // White 20%
  static const Color glass = Color(0x1AFFFFFF); // White 10%

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBg,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        surface: Colors.transparent,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
    );
  }
}
