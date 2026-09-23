import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/ai_report_model.dart';
import '../models/fps_telemetry_model.dart';

class AiAnalysisService {
  final String? apiKey;

  AiAnalysisService({this.apiKey});

  Future<AiReportModel> analyzeFpsSimulation(FpsTelemetrySession telemetry) async {
    // If an API key is available, attempt real Gemini API query
    if (apiKey != null && apiKey!.isNotEmpty) {
      try {
        final prompt = """
Проанализируй симуляцию бариста ОТ ПЕРВОГО ЛИЦА (FPS 3D VR).
Телеметрия игрока:
${jsonEncode(telemetry.toJson())}

Оцени точность и последовательность действий в 3D, стрессоустойчивость при личном контакте с клиентом и умение работать с кассой.
Верни ТОЛЬКО валидный JSON со следующими полями:
{
  "fit_score": 94,
  "grade_level": "Senior Barista Specialist",
  "career_verdict": "...",
  "summary": "...",
  "strengths": ["...", "..."],
  "growth_areas": ["...", "..."],
  "radar": {
    "motor_skills": 94,
    "tech_discipline": 98,
    "stress_resistance": 90,
    "business_management": 92,
    "reaction_speed": 95
  },
  "xp_earned": 950
}
""";

        final url = Uri.parse(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey',
        );

        final response = await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            "contents": [
              {
                "parts": [{"text": prompt}]
              }
            ]
          }),
        ).timeout(const Duration(seconds: 8));

        if (response.statusCode == 200) {
          final resData = jsonDecode(response.body);
          final text = resData['candidates']?[0]?['content']?['parts']?[0]?['text'] as String?;
          if (text != null) {
            final cleanedJson = text.replaceAll('```json', '').replaceAll('```', '').trim();
            final jsonMap = jsonDecode(cleanedJson);
            return AiReportModel.fromJson(jsonMap);
          }
        }
      } catch (_) {
        // Fallback to offline scoring engine
      }
    }

    // Offline rule-based scoring (used when no API key is configured or the request fails)
    await Future.delayed(const Duration(milliseconds: 1400));
    return _generateLocalScoring(telemetry);
  }

  AiReportModel _generateLocalScoring(FpsTelemetrySession t) {
    final accuracy = t.fpsMetrics.stepAccuracyPercent;
    final time = t.fpsMetrics.totalPreparationTimeSec;
    final hasExtraActions = t.fpsMetrics.extraActionsDetected;
    final conflictGood = t.softSkills.conflictResolutionChoice.contains('Apologized');
    final mgmtAcc = t.management.inventoryCalcAccuracy;

    int motor = hasExtraActions ? 82 : (accuracy > 90 ? 96 : 88);
    int tech = accuracy.clamp(60, 100);
    int stress = conflictGood ? 98 : 72;
    int mgmt = mgmtAcc.clamp(50, 100);
    int speed = (time <= 45) ? 96 : ((time <= 65) ? 88 : 75);

    int fitScore = ((motor * 0.25) + (tech * 0.3) + (stress * 0.25) + (mgmt * 0.1) + (speed * 0.1)).round();
    fitScore = fitScore.clamp(50, 99);

    String grade = 'Junior Barista';
    String verdict = 'Хороший базовый потенциал. Рекомендуется отработка скорости темперовки и стандартов сервиса.';

    if (fitScore >= 90) {
      grade = 'Senior Barista / Shift Supervisor';
      verdict = 'Исключительная моторика рук, идеальное знание технологии экстракции и зрелый подход к разрешению конфликтов с гостями.';
    } else if (fitScore >= 78) {
      grade = 'Middle Barista';
      verdict = 'Уверенная работа с рожковой кофемашиной и паром. Требуется минимальная доводка коммуникации в пиковые часы.';
    }

    return AiReportModel(
      fitScore: fitScore,
      gradeLevel: grade,
      careerVerdict: verdict,
      summary: 'Продемонстрировано четкое следование рецептуре Iced Oat Latte с правильной последовательностью эстракции и текстурирования молока.',
      strengths: [
        'Точная последовательность: помол -> темперовка -> пролив -> взбивание',
        conflictGood ? 'Эмпатичная и быстрая деэскалация инцидента с гостем' : 'Следование регламенту кофейни',
        'Оптимальный баланс запасов сырья без заморозки оборотного капитала'
      ],
      growthAreas: [
        if (hasExtraActions) 'Меньше лишних действий: сначала найдите нужный предмет, потом действуйте',
        if (time > 50) 'Оптимизация эргономики движений для сокращения времени отдачи напитка',
        'Углубленное изучение сенсорного анализа и профилей обжарки specialty-кофе'
      ],
      radar: SkillRadarData.fromScores(
        motor: motor,
        tech: tech,
        stress: stress,
        mgmt: mgmt,
        speed: speed,
      ),
      xpEarned: 600 + (fitScore * 4),
    );
  }
}
