class FpsMetrics {
  final int stepAccuracyPercent;
  final bool handShakinessDetected;
  final int totalPreparationTimeSec;

  const FpsMetrics({
    required this.stepAccuracyPercent,
    required this.handShakinessDetected,
    required this.totalPreparationTimeSec,
  });

  factory FpsMetrics.fromJson(Map<String, dynamic> json) {
    return FpsMetrics(
      stepAccuracyPercent: json['step_accuracy_percent'] as int? ?? 90,
      handShakinessDetected: json['hand_shakiness_detected'] as bool? ?? false,
      totalPreparationTimeSec: json['total_preparation_time_sec'] as int? ?? 45,
    );
  }

  Map<String, dynamic> toJson() => {
    'step_accuracy_percent': stepAccuracyPercent,
    'hand_shakiness_detected': handShakinessDetected,
    'total_preparation_time_sec': totalPreparationTimeSec,
  };
}

class SoftSkillsMetrics {
  final String conflictResolutionChoice;
  final double eyeContactHeldSec;

  const SoftSkillsMetrics({
    required this.conflictResolutionChoice,
    required this.eyeContactHeldSec,
  });

  factory SoftSkillsMetrics.fromJson(Map<String, dynamic> json) {
    return SoftSkillsMetrics(
      conflictResolutionChoice: json['conflict_resolution_choice'] as String? ?? 'Apologized & Remade Fast',
      eyeContactHeldSec: (json['eye_contact_held_sec'] as num?)?.toDouble() ?? 4.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'conflict_resolution_choice': conflictResolutionChoice,
    'eye_contact_held_sec': eyeContactHeldSec,
  };
}

class ManagementMetrics {
  final int inventoryCalcAccuracy;

  const ManagementMetrics({
    required this.inventoryCalcAccuracy,
  });

  factory ManagementMetrics.fromJson(Map<String, dynamic> json) {
    return ManagementMetrics(
      inventoryCalcAccuracy: json['inventory_calc_accuracy'] as int? ?? 100,
    );
  }

  Map<String, dynamic> toJson() => {
    'inventory_calc_accuracy': inventoryCalcAccuracy,
  };
}

class FpsTelemetrySession {
  final String viewMode;
  final FpsMetrics fpsMetrics;
  final SoftSkillsMetrics softSkills;
  final ManagementMetrics management;

  const FpsTelemetrySession({
    this.viewMode = "First-Person 3D VR",
    required this.fpsMetrics,
    required this.softSkills,
    required this.management,
  });

  factory FpsTelemetrySession.fromJson(Map<String, dynamic> json) {
    return FpsTelemetrySession(
      viewMode: json['view_mode'] as String? ?? "First-Person 3D VR",
      fpsMetrics: json['fps_metrics'] != null 
          ? FpsMetrics.fromJson(json['fps_metrics'] as Map<String, dynamic>)
          : const FpsMetrics(stepAccuracyPercent: 95, handShakinessDetected: false, totalPreparationTimeSec: 42),
      softSkills: json['soft_skills'] != null 
          ? SoftSkillsMetrics.fromJson(json['soft_skills'] as Map<String, dynamic>)
          : const SoftSkillsMetrics(conflictResolutionChoice: 'Apologized & Remade Fast', eyeContactHeldSec: 4.5),
      management: json['management'] != null
          ? ManagementMetrics.fromJson(json['management'] as Map<String, dynamic>)
          : const ManagementMetrics(inventoryCalcAccuracy: 100),
    );
  }

  Map<String, dynamic> toJson() => {
    'view_mode': viewMode,
    'fps_metrics': fpsMetrics.toJson(),
    'soft_skills': softSkills.toJson(),
    'management': management.toJson(),
  };
}
