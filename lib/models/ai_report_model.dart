class SkillRadarData {
  final int motorSkills;       // Мелкая моторика и координация в 3D
  final int techDiscipline;     // Соблюдение технологической карты
  final int stressResistance;   // Стрессоустойчивость и эмпатия
  final int businessManagement; // Финансовый расчет и инвентарь
  final int reactionSpeed;      // Скорость реакции и тайминг

  const SkillRadarData({
    required this.motorSkills,
    required this.techDiscipline,
    required this.stressResistance,
    required this.businessManagement,
    required this.reactionSpeed,
  });

  factory SkillRadarData.fromScores({
    required int motor,
    required int tech,
    required int stress,
    required int mgmt,
    required int speed,
  }) {
    return SkillRadarData(
      motorSkills: motor.clamp(0, 100),
      techDiscipline: tech.clamp(0, 100),
      stressResistance: stress.clamp(0, 100),
      businessManagement: mgmt.clamp(0, 100),
      reactionSpeed: speed.clamp(0, 100),
    );
  }

  factory SkillRadarData.fromJson(Map<String, dynamic> json) {
    return SkillRadarData(
      motorSkills: json['motor_skills'] as int? ?? 92,
      techDiscipline: json['tech_discipline'] as int? ?? 95,
      stressResistance: json['stress_resistance'] as int? ?? 88,
      businessManagement: json['business_management'] as int? ?? 90,
      reactionSpeed: json['reaction_speed'] as int? ?? 94,
    );
  }

  Map<String, dynamic> toJson() => {
    'motor_skills': motorSkills,
    'tech_discipline': techDiscipline,
    'stress_resistance': stressResistance,
    'business_management': businessManagement,
    'reaction_speed': reactionSpeed,
  };
}

class AiReportModel {
  final int fitScore;
  final String gradeLevel;
  final String careerVerdict;
  final String summary;
  final List<String> strengths;
  final List<String> growthAreas;
  final SkillRadarData radar;
  final int xpEarned;

  const AiReportModel({
    required this.fitScore,
    required this.gradeLevel,
    required this.careerVerdict,
    required this.summary,
    required this.strengths,
    required this.growthAreas,
    required this.radar,
    required this.xpEarned,
  });

  factory AiReportModel.fromJson(Map<String, dynamic> json) {
    return AiReportModel(
      fitScore: json['fit_score'] as int? ?? 92,
      gradeLevel: json['grade_level'] as String? ?? 'Senior Barista Specialist',
      careerVerdict: json['career_verdict'] as String? ?? 'Высокая профессиональная пригодность к должности Старшего Бариста / Управляющего кофейни.',
      summary: json['summary'] as String? ?? 'Отличная моторика рук, идеальное владение технологической картой и эмоциональная устойчивость при личном контакте с гостем.',
      strengths: (json['strengths'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [
        'Безупречная последовательность эстракции и взбивания молока',
        'Быстрая деэскалация конфликта с предложением решения',
        'Точный расчет заказа зерна без дефицита'
      ],
      growthAreas: (json['growth_areas'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [
        'Повышение скорости темперовки при утреннем пике',
        'Глубокий анализ маржинальности сопутствующих десертов'
      ],
      radar: json['radar'] != null ? SkillRadarData.fromJson(json['radar'] as Map<String, dynamic>) : const SkillRadarData(
        motorSkills: 94,
        techDiscipline: 98,
        stressResistance: 90,
        businessManagement: 92,
        reactionSpeed: 95,
      ),
      xpEarned: json['xp_earned'] as int? ?? 950,
    );
  }
}
