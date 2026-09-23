import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config.dart';
import '../theme/app_theme.dart';
import 'sim_view/sim_view.dart';

/// 3D barista simulator (web client from assets/sim) embedded into the app.
class ThreeDFpsViewport extends StatelessWidget {
  final ValueChanged<String>? onMessageReceived;

  const ThreeDFpsViewport({super.key, this.onMessageReceived});

  @override
  Widget build(BuildContext context) {
    return SimView(
      module: 'barista',
      apiBaseUrl: apiBaseUrl,
      onMessage: onMessageReceived,
      fallback: const _SimUnavailable(),
    );
  }
}

class _SimUnavailable extends StatelessWidget {
  const _SimUnavailable();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppTheme.darkSlate,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: Text(
        '3D-симулятор работает на Android, iOS и в браузере.\nЗадания можно пройти с панелью ниже.',
        textAlign: TextAlign.center,
        style: GoogleFonts.plusJakartaSans(fontSize: 13, color: AppTheme.textMutedDark, height: 1.5),
      ),
    );
  }
}
