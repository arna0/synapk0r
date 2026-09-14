import 'dart:convert';

/// Log for Stage 1: Order Assembly (Hard Skills)
class Quest1CookingLog {
  final bool success;
  final int timeTakenSec;
  final int errors;
  final List<String> stepsCompleted;

  const Quest1CookingLog({
    required this.success,
    required this.timeTakenSec,
    required this.errors,
    required this.stepsCompleted,
  });

  Map<String, dynamic> toJson() => {
        'success': success,
        'time_taken_sec': timeTakenSec,
        'errors': errors,
      };

  factory Quest1CookingLog.fromJson(Map<String, dynamic> json) {
    return Quest1CookingLog(
      success: json['success'] as bool? ?? false,
      timeTakenSec: (json['time_taken_sec'] as num?)?.toInt() ?? 0,
      errors: (json['errors'] as num?)?.toInt() ?? 0,
      stepsCompleted: (json['steps_completed'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}

/// Log for Stage 2: Conflict Resolution (Soft Skills)
class Quest2ConflictLog {
  final String chosenOption;
  final String chosenOptionText;
  final double reactionTimeSec;

  const Quest2ConflictLog({
    required this.chosenOption,
    required this.chosenOptionText,
    required this.reactionTimeSec,
  });

  Map<String, dynamic> toJson() => {
        'chosen_option': chosenOption,
        'reaction_time_sec': double.parse(reactionTimeSec.toStringAsFixed(2)),
      };

  factory Quest2ConflictLog.fromJson(Map<String, dynamic> json) {
    return Quest2ConflictLog(
      chosenOption: json['chosen_option'] as String? ?? 'N/A',
      chosenOptionText: json['chosen_option_text'] as String? ?? '',
      reactionTimeSec: (json['reaction_time_sec'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

/// Log for Stage 3: Inventory & Management
class Quest3ManagementLog {
  final String inventoryDecision;
  final int budgetUsed;
  final bool budgetCorrect;

  const Quest3ManagementLog({
    required this.inventoryDecision,
    required this.budgetUsed,
    required this.budgetCorrect,
  });

  Map<String, dynamic> toJson() => {
        'inventory_decision': inventoryDecision,
        'budget_correct': budgetCorrect,
      };

  factory Quest3ManagementLog.fromJson(Map<String, dynamic> json) {
    return Quest3ManagementLog(
      inventoryDecision: json['inventory_decision'] as String? ?? 'N/A',
      budgetUsed: (json['budget_used'] as num?)?.toInt() ?? 0,
      budgetCorrect: json['budget_correct'] as bool? ?? false,
    );
  }
}

/// Comprehensive Game Session Log submitted to AI Analysis Service
class GameLogModel {
  final String profession;
  final int totalTimeSeconds;
  final Quest1CookingLog quest1Cooking;
  final Quest2ConflictLog quest2Conflict;
  final Quest3ManagementLog quest3Management;
  final DateTime createdAt;

  GameLogModel({
    required this.profession,
    required this.totalTimeSeconds,
    required this.quest1Cooking,
    required this.quest2Conflict,
    required this.quest3Management,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'profession': profession,
        'total_time_seconds': totalTimeSeconds,
        'quest_1_cooking': quest1Cooking.toJson(),
        'quest_2_conflict': quest2Conflict.toJson(),
        'quest_3_management': quest3Management.toJson(),
      };

  String toFormattedJson() {
    return const JsonEncoder.withIndent('  ').convert(toJson());
  }

  factory GameLogModel.fromJson(Map<String, dynamic> json) {
    return GameLogModel(
      profession: json['profession'] as String? ?? 'Barista & Cafe Manager',
      totalTimeSeconds: (json['total_time_seconds'] as num?)?.toInt() ?? 0,
      quest1Cooking: Quest1CookingLog.fromJson(
          json['quest_1_cooking'] as Map<String, dynamic>? ?? {}),
      quest2Conflict: Quest2ConflictLog.fromJson(
          json['quest_2_conflict'] as Map<String, dynamic>? ?? {}),
      quest3Management: Quest3ManagementLog.fromJson(
          json['quest_3_management'] as Map<String, dynamic>? ?? {}),
    );
  }
}
