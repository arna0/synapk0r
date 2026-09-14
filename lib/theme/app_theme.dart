import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Clean Pro SaaS Palette
  static const Color primaryBlue = Color(0xFF0052FF); // Deep Electric Blue (Coinbase / Linear)
  static const Color darkSlate = Color(0xFF0F172A);   // Deep Slate Navy
  static const Color slateCard = Color(0xFF1E293B);   // Slate Surface Card
  static const Color bgLight = Color(0xFFF8FAFC);     // Clean Slate Off-White
  static const Color surfaceWhite = Color(0xFFFFFFFF);// Pure White Card
  static const Color borderLight = Color(0xFFE2E8F0); // Crisp Light Border
  static const Color borderDark = Color(0xFF334155);  // Crisp Dark Border
  
  // Clean Accents & Statuses
  static const Color emeraldGreen = Color(0xFF10B981);// Emerald Success / XP
  static const Color amberWarning = Color(0xFFF59E0B);// Amber Warning
  static const Color roseError = Color(0xFFEF4444);   // Rose Error
  
  // Text Colors
  static const Color textPrimary = Color(0xFF0F172A); // Deep Charcoal
  static const Color textSecondary = Color(0xFF64748B); // Muted Slate Gray
  static const Color textOnDark = Color(0xFFF8FAFC);
  static const Color textMutedDark = Color(0xFF94A3B8);

  // Backward-compatible color aliases
  static const Color bgDark = darkSlate;
  static const Color surfaceDark = darkSlate;
  static const Color surfaceCard = slateCard;
  static const Color borderGlow = borderDark;
  static const Color neonCyan = primaryBlue;
  static const Color neonPurple = primaryBlue;
  static const Color neonPink = roseError;
  static const Color neonGold = amberWarning;
  static const Color neonRed = roseError;
  static const Color textMuted = textSecondary;

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: bgLight,
      primaryColor: primaryBlue,
      colorScheme: const ColorScheme.light(
        primary: primaryBlue,
        secondary: emeraldGreen,
        surface: surfaceWhite,
        error: roseError,
      ),
      textTheme: TextTheme(
        headlineLarge: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w800, color: textPrimary, letterSpacing: -0.5),
        headlineMedium: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w700, color: textPrimary, letterSpacing: -0.3),
        titleMedium: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w600, color: textPrimary),
        bodyLarge: GoogleFonts.plusJakartaSans(fontSize: 14, color: textPrimary),
        bodyMedium: GoogleFonts.plusJakartaSans(fontSize: 13, color: textSecondary),
        labelSmall: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w600, color: textSecondary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkSlate,
      primaryColor: primaryBlue,
      colorScheme: const ColorScheme.dark(
        primary: primaryBlue,
        secondary: emeraldGreen,
        surface: slateCard,
        error: roseError,
      ),
      textTheme: TextTheme(
        headlineLarge: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w800, color: textOnDark, letterSpacing: -0.5),
        headlineMedium: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w700, color: textOnDark, letterSpacing: -0.3),
        titleMedium: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w600, color: textOnDark),
        bodyLarge: GoogleFonts.plusJakartaSans(fontSize: 14, color: textOnDark),
        bodyMedium: GoogleFonts.plusJakartaSans(fontSize: 13, color: textMutedDark),
        labelSmall: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w600, color: textMutedDark),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        ),
      ),
    );
  }
}
