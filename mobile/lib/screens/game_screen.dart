import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/fps_telemetry_model.dart';
import '../providers/game_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/fps_hud_overlay.dart';
import '../widgets/three_d_fps_viewport.dart';
import 'result_screen.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  bool _navigatedToResult = false;

  /// Final telemetry posted by the WebView simulator (window.FlutterChannel).
  void _onWebViewMessage(String data) {
    try {
      final decoded = jsonDecode(data);
      if (decoded is Map<String, dynamic> &&
          decoded['type'] == 'session_complete' &&
          decoded['fps_metrics'] != null) {
        context.read<GameProvider>().finishWithTelemetry(FpsTelemetrySession.fromJson(decoded));
      }
    } catch (_) {
      // Non-JSON messages are ignored; 'action' messages are live logs
    }
  }

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameProvider>();

    // Navigate to ResultScreen exactly once when the report is ready
    if (!_navigatedToResult && game.status == GameStatus.completed && game.report != null) {
      _navigatedToResult = true;
      final report = game.report!;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => ResultScreen(report: report)),
        );
      });
    }

    final minutes = (game.elapsedSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (game.elapsedSeconds % 60).toString().padLeft(2, '0');

    return Scaffold(
      backgroundColor: AppTheme.darkSlate,
      body: SafeArea(
        child: Column(
          children: [
            // Top Pro HUD Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppTheme.primaryBlue,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          game.currentQuest == 1
                              ? 'КВЕСТ 1: ICED OAT LATTE'
                              : (game.currentQuest == 2 ? 'КВЕСТ 2: ОБЩЕНИЕ С КЛИЕНТОМ' : 'КВЕСТ 3: КАССА И ЗАКУПКИ'),
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.timer_outlined, size: 14, color: AppTheme.textMutedDark),
                        const SizedBox(width: 6),
                        Text(
                          '$minutes:$seconds',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF94A3B8)),
                    onPressed: () {
                      game.resetToHome();
                      Navigator.pop(context);
                    },
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ),

            // 3D FPS VR Viewport (75%)
            Expanded(
              child: Stack(
                children: [
                  ThreeDFpsViewport(
                    onMessageReceived: _onWebViewMessage,
                  ),
                  if (game.status == GameStatus.analyzing)
                    Container(
                      color: const Color(0xFF0F172A).withOpacity(0.92),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SizedBox(
                              width: 36,
                              height: 36,
                              child: CircularProgressIndicator(
                                strokeWidth: 3,
                                color: AppTheme.primaryBlue,
                              ),
                            ),
                            const SizedBox(height: 20),
                            Text(
                              'АНАЛИЗ РЕЗУЛЬТАТОВ...',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Оценка моторики, времени экстракции и дисциплины',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12,
                                color: const Color(0xFF94A3B8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // FPS HUD Overlay (25%)
            const FpsHudOverlay(),
          ],
        ),
      ),
    );
  }
}
