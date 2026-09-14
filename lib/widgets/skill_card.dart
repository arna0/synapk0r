import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:percent_indicator/linear_percent_indicator.dart';
import '../models/ai_report_model.dart';
import '../theme/app_theme.dart';

/// Interactive Skill Point Card for Strong & Weak points analysis
class SkillBulletCard extends StatelessWidget {
  final String title;
  final List<String> points;
  final bool isPositive;

  const SkillBulletCard({
    super.key,
    required this.title,
    required this.points,
    required this.isPositive,
  });

  @override
  Widget build(BuildContext context) {
    final accentColor =
        isPositive ? AppTheme.neonCyan : AppTheme.neonPink;
    final icon = isPositive
        ? Icons.verified_rounded
        : Icons.trending_up_rounded;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.cyberpunkCard(
        borderColor: accentColor.withOpacity(0.4),
        glowColor: accentColor,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: accentColor, size: 20),
              const SizedBox(width: 8),
              Text(
                title.toUpperCase(),
                style: GoogleFonts.orbitron(
                  color: accentColor,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...points.map(
            (point) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 6),
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: accentColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      point,
                      style: GoogleFonts.plusJakartaSans(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 13,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Soft Skills Breakdown Rating Widget with Linear Animated Indicators
class SoftSkillsBreakdownCard extends StatelessWidget {
  final SoftSkillsRating rating;

  const SoftSkillsBreakdownCard({super.key, required this.rating});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: AppTheme.cyberpunkCard(
        borderColor: AppTheme.accentPurple.withOpacity(0.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.bolt_rounded,
                  color: AppTheme.neonYellow, size: 20),
              const SizedBox(width: 8),
              Text(
                'SOFT & HARD SKILLS ОЦЕНКА',
                style: GoogleFonts.orbitron(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildSkillRow(
            name: 'Коммуникация & Сервис',
            score: rating.communication,
            color: AppTheme.neonCyan,
            icon: Icons.chat_bubble_outline_rounded,
          ),
          const SizedBox(height: 12),
          _buildSkillRow(
            name: 'Стрессоустойчивость',
            score: rating.stressTolerance,
            color: AppTheme.neonPink,
            icon: Icons.psychology_outlined,
          ),
          const SizedBox(height: 12),
          _buildSkillRow(
            name: 'Скорость & Тайм-менеджмент',
            score: rating.speed,
            color: AppTheme.neonYellow,
            icon: Icons.speed_rounded,
          ),
        ],
      ),
    );
  }

  Widget _buildSkillRow({
    required String name,
    required int score,
    required Color color,
    required IconData icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 16),
                const SizedBox(width: 8),
                Text(
                  name,
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            Text(
              '$score%',
              style: GoogleFonts.orbitron(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        LinearPercentIndicator(
          lineHeight: 8.0,
          percent: (score / 100.0).clamp(0.0, 1.0),
          backgroundColor: Colors.white10,
          progressColor: color,
          barRadius: const Radius.circular(4),
          padding: EdgeInsets.zero,
          animation: true,
          animationDuration: 1200,
        ),
      ],
    );
  }
}
