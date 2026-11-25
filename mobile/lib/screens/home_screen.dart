import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import 'game_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Clean Pro Top Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        'SYNAPK',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 1.5),
                        child: const Icon(Icons.remove_red_eye_rounded, color: AppTheme.primaryBlue, size: 17),
                      ),
                      Text(
                        'R',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.darkSlate,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'VR 3D',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: const Text(
                      '⚡ 2800 XP',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF047857)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Hero Barista VR Card
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.surfaceWhite,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.borderLight),
                  boxShadow: const [
                    BoxShadow(color: Color.fromRGBO(15, 23, 42, 0.05), blurRadius: 12, offset: Offset(0, 4)),
                  ],
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.sports_esports_rounded, size: 13, color: Color(0xFF1D4ED8)),
                          SizedBox(width: 4),
                          Text(
                            '3D-симуляция',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Бариста',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textPrimary,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Интерактивный симулятор работы бариста: свободное перемещение за стойкой (WASD), точная моторика помола, темперовки, экстракции и стресс-тест коммуникации.',
                      style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.5),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const GameScreen()),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryBlue,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.play_arrow_rounded, size: 20),
                          SizedBox(width: 6),
                          Text('Запустить симуляцию', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              const Text(
                'ДРУГИЕ ПРОФЕССИИ',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 0.5),
              ),
              const SizedBox(height: 10),
              _buildModuleTile(context, 'it', '🖥️', 'IT-инженер', 'Инцидент в серверной, баг в коде, разговор с заказчиком'),
              _buildModuleTile(context, 'doctor', '🩺', 'Врач-терапевт', 'Осмотр пациента, клиническое решение, разговор'),
              _buildModuleTile(context, 'safety', '⚡', 'Инженер по ТБ', 'Подготовка щита 380 В к ремонту по процедуре LOTO'),
              const SizedBox(height: 20),

              const Text(
                'УПРАВЛЕНИЕ В СИМУЛЯТОРЕ',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.textSecondary, letterSpacing: 0.5),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _buildTrainingCard('🕹️', 'WASD / Д-Пад', 'Свободный шаг вдоль барной стойки'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTrainingCard('👀', 'Обзор + [E]', 'Вращение камеры и действие по прицелу'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// IT, doctor and safety run fully inside the embedded simulator, which shows its own skills report.
  Widget _buildModuleTile(BuildContext context, String module, String emoji, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => GameScreen(module: module)),
          ),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.borderLight),
            ),
            child: Row(
              children: [
                Text(emoji, style: const TextStyle(fontSize: 22)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                      const SizedBox(height: 2),
                      Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.35)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppTheme.textSecondary),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTrainingCard(String emoji, String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceWhite,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderLight),
        boxShadow: const [
          BoxShadow(color: Color.fromRGBO(15, 23, 42, 0.04), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 20)),
          const SizedBox(height: 8),
          Text(
            title,
            style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 3),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.4),
          ),
        ],
      ),
    );
  }
}
