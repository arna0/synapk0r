import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class FpsHudOverlay extends StatelessWidget {
  const FpsHudOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameProvider>();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(
          top: BorderSide(color: Color(0xFF334155), width: 1),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (game.currentQuest == 1) _buildQuest1HUD(context, game),
          if (game.currentQuest == 2) _buildQuest2HUD(context, game),
          if (game.currentQuest == 3) _buildQuest3HUD(context, game),
        ],
      ),
    );
  }

  Widget _buildQuest1HUD(BuildContext context, GameProvider game) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Step progress chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: List.generate(game.stepsConfig.length, (idx) {
              final isDone = idx < game.currentStep;
              final isCurrent = idx == game.currentStep;
              return Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDone
                      ? const Color(0xFF10B981).withOpacity(0.12)
                      : (isCurrent ? AppTheme.primaryBlue.withOpacity(0.2) : const Color(0xFF1E293B)),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isDone
                        ? const Color(0xFF10B981)
                        : (isCurrent ? AppTheme.primaryBlue : const Color(0xFF334155)),
                  ),
                ),
                child: Text(
                  '${isDone ? "✓ " : ""}${game.stepsConfig[idx]['name']!.split(' ')[0]}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                    color: isDone
                        ? const Color(0xFF34D399)
                        : (isCurrent ? Colors.white : const Color(0xFF94A3B8)),
                  ),
                ),
              );
            }),
          ),
        ),
        const SizedBox(height: 12),

        // Current target instruction
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ТЕКУЩАЯ ЦЕЛЬ',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      game.stepsConfig[game.currentStep]['name']!,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              ElevatedButton(
                onPressed: () => game.advanceStep(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryBlue,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  elevation: 0,
                ),
                child: Text(
                  'Выполнено',
                  style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuest2HUD(BuildContext context, GameProvider game) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: Text(
            '😡 Клиент: «Я трижды повторил: БЕЗ САХАРА! Вы испортили мой заказ!»',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: const Color(0xFFF8FAFC),
            ),
          ),
        ),
        const SizedBox(height: 10),
        _buildChoiceBtn(
          tag: 'A',
          tagColor: AppTheme.roseError,
          text: '«Вы сами так заказали, проверяйте чек»',
          onTap: () => game.selectConflict('Defensive'),
        ),
        _buildChoiceBtn(
          tag: 'B',
          tagColor: AppTheme.primaryBlue,
          text: '«Простите за ошибку! Быстро переделаю и подарю десерт»',
          onTap: () => game.selectConflict('Apologized & Remade Fast'),
        ),
        _buildChoiceBtn(
          tag: 'C',
          tagColor: AppTheme.amberWarning,
          text: '«Подождите, я позову старшего смены»',
          onTap: () => game.selectConflict('Call Manager'),
        ),
      ],
    );
  }

  Widget _buildQuest3HUD(BuildContext context, GameProvider game) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          '💼 Управление запасами (Бюджет: 120 000 ₸)',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 8),
        _buildChoiceBtn(
          tag: '1',
          tagColor: AppTheme.textMutedDark,
          text: '45 000 ₸ (15 кг) — Экономия, риск дефицита',
          onTap: () => game.selectBudget('low'),
        ),
        _buildChoiceBtn(
          tag: '2',
          tagColor: AppTheme.emeraldGreen,
          text: '90 000 ₸ (35 кг) — Оптимально (+30к резерв)',
          onTap: () => game.selectBudget('optimal'),
        ),
        _buildChoiceBtn(
          tag: '3',
          tagColor: AppTheme.roseError,
          text: '135 000 ₸ (55 кг) — Перерасход бюджета',
          onTap: () => game.selectBudget('high'),
        ),
      ],
    );
  }

  Widget _buildChoiceBtn({
    required String tag,
    required Color tagColor,
    required String text,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: tagColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              alignment: Alignment.center,
              child: Text(
                tag,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: tagColor,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                text,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
