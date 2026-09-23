import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/ai_report_model.dart';
import '../models/fps_telemetry_model.dart';

/// Builds the skill report for a finished session.
///
/// The score and skill radar come from transparent local rules. When [apiBaseUrl] points to the
/// SynapKor backend, the text part (summary, strengths, growth areas, career advice) is written by
/// Claude on the server; the API key never ships inside the app.
class AiAnalysisService {
  final String apiBaseUrl;
  final http.Client _client;

  AiAnalysisService({this.apiBaseUrl = '', http.Client? client}) : _client = client ?? http.Client();

  Future<AiReportModel> analyzeFpsSimulation(FpsTelemetrySession telemetry) async {
    final local = _generateLocalScoring(telemetry);
    if (apiBaseUrl.isEmpty) {
      await Future.delayed(const Duration(milliseconds: 600));
      return local;
    }

    try {
      final response = await _client
          .post(
            Uri.parse('$apiBaseUrl/api/report'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(_backendPayload(telemetry, local.fitScore)),
          )
          .timeout(const Duration(seconds: 60));

      if (response.statusCode == 200) {
        final data = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
        return local.withFeedback(
          source: data['source'] as String? ?? 'rules',
          summary: data['summary'] as String? ?? local.summary,
          strengths: (data['strengths'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? local.strengths,
          growthAreas: (data['growth_areas'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? local.growthAreas,
          careerAdvice: data['career_advice'] as String? ?? local.careerVerdict,
        );
      }
    } catch (_) {
      // Backend unreachable or bad response: keep the local report
    }
    return local;
  }

  Map<String, dynamic> _backendPayload(FpsTelemetrySession t, int score) {
    final choice = t.softSkills.conflictResolutionChoice;
    return {
      'module': 'barista',
      'score': score,
      'metrics': {
        'step_accuracy_percent': t.fpsMetrics.stepAccuracyPercent,
        'wrong_clicks': ((100 - t.fpsMetrics.stepAccuracyPercent) / 2).round(),
        'total_time_sec': t.fpsMetrics.totalPreparationTimeSec,
        'conflict_choice': choice,
        'conflict_response_sec': t.softSkills.responseTimeSec,
        'budget_choice': t.management.inventoryCalcAccuracy >= 100 ? 'optimal' : 'not_optimal',
      },
      'events': <Map<String, dynamic>>[],
    };
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
