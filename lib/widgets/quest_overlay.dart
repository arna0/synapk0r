import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../theme/app_theme.dart';

class QuestOverlay extends StatelessWidget {
  const QuestOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameProvider>();

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 350),
        transitionBuilder: (child, animation) {
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.05),
                end: Offset.zero,
              ).animate(animation),
              child: child,
            ),
          );
        },
        child: _buildStageContent(context, game),
      ),
    );
  }

  Widget _buildStageContent(BuildContext context, GameProvider game) {
    switch (game.stage) {
      case GameStage.quest1Cooking:
        return _buildQuest1Content(context, game);
      case GameStage.quest2Conflict:
        return _buildQuest2Content(context, game);
      case GameStage.quest3Management:
        return _buildQuest3Content(context, game);
      default:
        return const SizedBox.shrink();
    }
  }

  // ====================================================
  // STAGE 1: HARD SKILLS (ORDER ASSEMBLY)
  // ====================================================
  Widget _buildQuest1Content(BuildContext context, GameProvider game) {
    final steps = GameProvider.requiredRecipeSequence;
    final currentStep = game.quest1StepIndex;

    return SingleChildScrollView(
      key: const ValueKey('Quest1Content'),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quest Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.accentPurple.withOpacity(0.25),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                          color: AppTheme.accentPurple.withOpacity(0.6)),
                    ),
                    child: Text(
                      'HARD SKILLS • КВЕСТ 1/3',
                      style: GoogleFonts.orbitron(
                        color: AppTheme.accentVioletLight,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Сборка заказа',
                    style: GoogleFonts.plusJakartaSans(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              // Timer Display
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black38,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.cardBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.timer_outlined,
                        color: AppTheme.neonCyan, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      '${game.quest1TimeSec}с',
                      style: GoogleFonts.orbitron(
                        color: AppTheme.neonCyan,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Order Target Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: AppTheme.cyberpunkCard(
              borderColor: AppTheme.accentPurple.withOpacity(0.4),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.accentPurple.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.local_cafe_rounded,
                      color: AppTheme.neonCyan, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ТЕКУЩИЙ ЗАКАЗ:',
                        style: GoogleFonts.orbitron(
                          color: AppTheme.textSecondary,
                          fontSize: 9,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        'Iced Oat Latte с сиропом',
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Sequence Steps Progress
          Text(
            'ТЕХНОЛОГИЧЕСКАЯ КАРТА (СОБЛЮДАЙТЕ ПОРЯДОК):',
            style: GoogleFonts.orbitron(
              color: AppTheme.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),

          Row(
            children: List.generate(steps.length, (index) {
              final stepName = steps[index];
              final isDone = index < currentStep;
              final isCurrent = index == currentStep;

              return Expanded(
                child: Container(
                  margin: EdgeInsets.only(right: index < 3 ? 8 : 0),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: isDone
                        ? AppTheme.neonCyan.withOpacity(0.15)
                        : (isCurrent
                            ? AppTheme.accentPurple.withOpacity(0.3)
                            : Colors.black26),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isDone
                          ? AppTheme.neonCyan
                          : (isCurrent
                              ? AppTheme.accentPurple
                              : AppTheme.cardBorder),
                      width: isCurrent ? 1.8 : 1.0,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        isDone
                            ? Icons.check_circle_rounded
                            : (isCurrent
                                ? Icons.arrow_circle_right_rounded
                                : Icons.circle_outlined),
                        size: 16,
                        color: isDone
                            ? AppTheme.neonCyan
                            : (isCurrent
                                ? AppTheme.accentVioletLight
                                : Colors.white30),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        stepName,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          fontWeight:
                              isCurrent ? FontWeight.bold : FontWeight.normal,
                          color: isDone || isCurrent
                              ? Colors.white
                              : Colors.white38,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),

          const SizedBox(height: 18),

          // Ingredients Quick Palette
          Text(
            'ИНВЕНТАРЬ / ИНГРЕДИЕНТЫ:',
            style: GoogleFonts.orbitron(
              color: AppTheme.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildIngredientBtn(
                context,
                title: 'Espresso',
                icon: Icons.coffee_rounded,
                color: const Color(0xFFE17055),
                onTap: () => game.onIngredientSelected('Espresso'),
              ),
              _buildIngredientBtn(
                context,
                title: 'Oat Milk',
                icon: Icons.water_drop_rounded,
                color: const Color(0xFF00CEC9),
                onTap: () => game.onIngredientSelected('Oat Milk'),
              ),
              _buildIngredientBtn(
                context,
                title: 'Syrup',
                icon: Icons.science_rounded,
                color: const Color(0xFFFDCB6E),
                onTap: () => game.onIngredientSelected('Syrup'),
              ),
              _buildIngredientBtn(
                context,
                title: 'Ice',
                icon: Icons.ac_unit_rounded,
                color: const Color(0xFF74B9FF),
                onTap: () => game.onIngredientSelected('Ice'),
              ),
              _buildIngredientBtn(
                context,
                title: 'Cow Milk',
                icon: Icons.coffee_outlined,
                color: Colors.grey,
                onTap: () => game.onIngredientSelected('Cow Milk'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildIngredientBtn(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splashColor: color.withOpacity(0.3),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppTheme.cardDark,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.5), width: 1.2),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 16),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ====================================================
  // STAGE 2: SOFT SKILLS (CONFLICT RESOLUTION)
  // ====================================================
  Widget _buildQuest2Content(BuildContext context, GameProvider game) {
    final progress = game.quest2RemainingTime / GameProvider.quest2MaxTimeSec;

    Color timerColor = AppTheme.neonCyan;
    if (progress < 0.3) {
      timerColor = AppTheme.neonRed;
    } else if (progress < 0.6) {
      timerColor = AppTheme.neonYellow;
    }

    return SingleChildScrollView(
      key: const ValueKey('Quest2Content'),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header & 10s Timer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.neonPink.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: AppTheme.neonPink.withOpacity(0.6)),
                ),
                child: Text(
                  'SOFT SKILLS • КВЕСТ 2/3',
                  style: GoogleFonts.orbitron(
                    color: AppTheme.neonPink,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                'ТАЙМЕР: ${game.quest2RemainingTime.toStringAsFixed(1)}с',
                style: GoogleFonts.orbitron(
                  color: timerColor,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Animated Timer Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              backgroundColor: Colors.white10,
              valueColor: AlwaysStoppedAnimation<Color>(timerColor),
              minHeight: 6,
            ),
          ),

          const SizedBox(height: 14),

          // Conflict Dialog Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: AppTheme.cyberpunkCard(
              borderColor: AppTheme.neonPink.withOpacity(0.5),
              glowColor: AppTheme.neonPink,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.neonPink.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.sentiment_very_dissatisfied_rounded,
                      color: AppTheme.neonPink, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'РАЗЪЯРЕННЫЙ ГОСТЬ В ЗАЛЕ:',
                        style: GoogleFonts.orbitron(
                          color: AppTheme.neonPink,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '«Вы что наделали?! Я просил на овсяном, а это коровье! У меня непереносимость лактозы!»',
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),
          Text(
            'ВЫБЕРИТЕ ВАРИАНТ ОТВЕТА (10 СЕКУНД):',
            style: GoogleFonts.orbitron(
              color: AppTheme.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),

          // Option A
          _buildConflictOption(
            context,
            optionTag: 'A',
            text: '«Вы сами так заказали, читайте чек»',
            subtext: 'Агрессивная позиция (Негатив)',
            isSelected: game.quest2ChosenOption == 'A',
            color: AppTheme.neonRed,
            onTap: () => game.selectQuest2Option(
              option: 'A',
              text: 'Вы сами так заказали, читайте чек',
            ),
          ),
          const SizedBox(height: 8),

          // Option B (Ideal)
          _buildConflictOption(
            context,
            optionTag: 'B',
            text: '«Извините! Сейчас быстро переделаю и дам купон»',
            subtext: 'Эмпатия и мгновенное решение (Идеально)',
            isSelected: game.quest2ChosenOption == 'B',
            color: AppTheme.neonCyan,
            onTap: () => game.selectQuest2Option(
              option: 'B',
              text: 'Извините! Сейчас быстро переделаю и дам купон',
            ),
          ),
          const SizedBox(height: 8),

          // Option C
          _buildConflictOption(
            context,
            optionTag: 'C',
            text: '«Позову старшего менеджера»',
            subtext: 'Нейтральная эскалация',
            isSelected: game.quest2ChosenOption == 'C',
            color: AppTheme.neonYellow,
            onTap: () => game.selectQuest2Option(
              option: 'C',
              text: 'Позову старшего менеджера',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConflictOption(
    BuildContext context, {
    required String optionTag,
    required String text,
    required String subtext,
    required bool isSelected,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isSelected
                ? color.withOpacity(0.2)
                : AppTheme.cardDark.withOpacity(0.8),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? color : AppTheme.cardBorder,
              width: isSelected ? 2.0 : 1.0,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  shape: BoxShape.circle,
                  border: Border.all(color: color),
                ),
                child: Center(
                  child: Text(
                    optionTag,
                    style: GoogleFonts.orbitron(
                      color: color,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      text,
                      style: GoogleFonts.plusJakartaSans(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtext,
                      style: GoogleFonts.plusJakartaSans(
                        color: AppTheme.textSecondary,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ====================================================
  // STAGE 3: MANAGEMENT (INVENTORY & BUDGET)
  // ====================================================
  Widget _buildQuest3Content(BuildContext context, GameProvider game) {
    return SingleChildScrollView(
      key: const ValueKey('Quest3Content'),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.neonYellow.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(6),
                  border:
                      Border.all(color: AppTheme.neonYellow.withOpacity(0.6)),
                ),
                child: Text(
                  'MANAGEMENT • КВЕСТ 3/3',
                  style: GoogleFonts.orbitron(
                    color: AppTheme.neonYellow,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black38,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Бюджет: 50 000 ₸',
                  style: GoogleFonts.orbitron(
                    color: AppTheme.neonCyan,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Problem Description Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: AppTheme.cyberpunkCard(
              borderColor: AppTheme.accentPurple.withOpacity(0.4),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.inventory_2_rounded,
                        color: AppTheme.neonCyan, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'ЗАКАЗ ЗЁРЕН НА ЗАВТРАШНИЙ ДЕНЬ',
                      style: GoogleFonts.orbitron(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Средний расход кофейни — 10-12 кг в день. Выберите стратегию закупки, чтобы не допустить дефицита и кассового разрыва.',
                  style: GoogleFonts.plusJakartaSans(
                    color: AppTheme.textSecondary,
                    fontSize: 12,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),
          Text(
            'ВЫБЕРИТЕ ОБЪЕМ ЗАКУПКИ:',
            style: GoogleFonts.orbitron(
              color: AppTheme.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),

          // Option 1: Мало
          _buildManagementOption(
            context,
            title: '15 000 ₸ (5 кг) — Мало',
            desc: 'Экономия бюджета, но зерно закончится к полудню (риск дефицита)',
            cost: 15000,
            isSelected: game.quest3ChosenDecision == 'low',
            color: AppTheme.neonYellow,
            onTap: () => game.selectQuest3Decision(
              decision: 'low',
              cost: 15000,
              isCorrect: false,
            ),
          ),
          const SizedBox(height: 8),

          // Option 2: Оптимально (Correct)
          _buildManagementOption(
            context,
            title: '35 000 ₸ (12 кг) — Оптимально',
            desc: 'Полное покрытие спроса смены + резерв 15 000 ₸ на кассе',
            cost: 35000,
            isSelected: game.quest3ChosenDecision == 'optimal',
            color: AppTheme.neonCyan,
            onTap: () => game.selectQuest3Decision(
              decision: 'optimal',
              cost: 35000,
              isCorrect: true,
            ),
          ),
          const SizedBox(height: 8),

          // Option 3: Много
          _buildManagementOption(
            context,
            title: '55 000 ₸ (20 кг) — Много',
            desc: 'Превышение лимита бюджета на 5 000 ₸, риск кассового разрыва',
            cost: 55000,
            isSelected: game.quest3ChosenDecision == 'high',
            color: AppTheme.neonRed,
            onTap: () => game.selectQuest3Decision(
              decision: 'high',
              cost: 55000,
              isCorrect: false,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildManagementOption(
    BuildContext context, {
    required String title,
    required String desc,
    required int cost,
    required bool isSelected,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isSelected
                ? color.withOpacity(0.2)
                : AppTheme.cardDark.withOpacity(0.8),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? color : AppTheme.cardBorder,
              width: isSelected ? 2.0 : 1.0,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                margin: const EdgeInsets.only(top: 2),
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: isSelected ? color : Colors.transparent,
                  shape: BoxShape.circle,
                  border: Border.all(color: color, width: 1.5),
                ),
                child: isSelected
                    ? const Icon(Icons.check, size: 14, color: Colors.black)
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.orbitron(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      desc,
                      style: GoogleFonts.plusJakartaSans(
                        color: AppTheme.textSecondary,
                        fontSize: 11,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
