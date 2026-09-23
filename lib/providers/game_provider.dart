import 'dart:async';
import 'package:flutter/material.dart';
import '../models/ai_report_model.dart';
import '../models/fps_telemetry_model.dart';
import '../services/ai_analysis_service.dart';

enum GameStatus { idle, running, analyzing, completed }

class GameProvider extends ChangeNotifier {
  final AiAnalysisService aiService;

  GameStatus _status = GameStatus.idle;
  GameStatus get status => _status;

  int _currentQuest = 1; // 1: Hard Skills, 2: Conflict, 3: Management
  int get currentQuest => _currentQuest;

  int _currentStep = 0;
  int get currentStep => _currentStep;

  int _elapsedSeconds = 0;
  int get elapsedSeconds => _elapsedSeconds;

  int _misclicks = 0;
  int get misclicks => _misclicks;

  String _conflictChoice = '';
  String get conflictChoice => _conflictChoice;

  String _budgetChoice = '';
  String get budgetChoice => _budgetChoice;

  DateTime? _quest2StartedAt;
  double _conflictResponseSec = 0;

  AiReportModel? _report;
  AiReportModel? get report => _report;

  Timer? _timer;

  final List<Map<String, String>> stepsConfig = [
    {'id': 'portafilter', 'name': 'Взять Холдер', 'hint': 'Кликните по холдеру на стойке'},
    {'id': 'grinder', 'name': 'Смолоть кофе', 'hint': 'Кликните по кофемолке для помола'},
    {'id': 'tamper', 'name': 'Затемперовать', 'hint': 'Кликните по темперу для прессовки'},
    {'id': 'espressoMachine', 'name': 'Сварить эспрессо', 'hint': 'Кликните по группе кофемашины'},
    {'id': 'milkPitcher', 'name': 'Взбить овсяное молоко', 'hint': 'Кликните по питчеру у парового крана'},
    {'id': 'glassCup', 'name': 'Собрать Iced Latte', 'hint': 'Кликните по прозрачному стакану'},
  ];

  GameProvider({required this.aiService});

  void startSession() {
    _status = GameStatus.running;
    _currentQuest = 1;
    _currentStep = 0;
    _elapsedSeconds = 0;
    _misclicks = 0;
    _conflictChoice = '';
    _budgetChoice = '';
    _quest2StartedAt = null;
    _conflictResponseSec = 0;
    _report = null;

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _elapsedSeconds++;
      notifyListeners();
    });

    notifyListeners();
  }

  void advanceStep() {
    if (_currentStep < stepsConfig.length - 1) {
      _currentStep++;
      notifyListeners();
    } else {
      // Transition to Quest 2
      _currentQuest = 2;
      _quest2StartedAt = DateTime.now();
      notifyListeners();
    }
  }

  void recordMisclick() {
    _misclicks++;
    notifyListeners();
  }

  void selectConflict(String option) {
    _conflictChoice = option;
    if (_quest2StartedAt != null) {
      _conflictResponseSec = DateTime.now().difference(_quest2StartedAt!).inMilliseconds / 1000.0;
    }
    _currentQuest = 3;
    notifyListeners();
  }

  void selectBudget(String option) {
    _budgetChoice = option;
    finishSession();
  }

  Future<void> finishSession() async {
    if (_status != GameStatus.running) return;

    final telemetry = FpsTelemetrySession(
      viewMode: "First-Person 3D VR",
      fpsMetrics: FpsMetrics(
        stepAccuracyPercent: (100 - _misclicks * 2).clamp(60, 100),
        extraActionsDetected: _misclicks > 2,
        totalPreparationTimeSec: _elapsedSeconds > 0 ? _elapsedSeconds : 42,
      ),
      softSkills: SoftSkillsMetrics(
        conflictResolutionChoice: _conflictChoice.isEmpty ? 'Apologized & Remade Fast' : _conflictChoice,
        responseTimeSec: _conflictResponseSec,
      ),
      management: ManagementMetrics(
        inventoryCalcAccuracy: _budgetChoice == 'optimal' ? 100 : 70,
      ),
    );

    await _analyze(telemetry);
  }

  /// Finish the session with telemetry reported by the 3D WebView simulator.
  Future<void> finishWithTelemetry(FpsTelemetrySession telemetry) async {
    if (_status != GameStatus.running) return;
    await _analyze(telemetry);
  }

  Future<void> _analyze(FpsTelemetrySession telemetry) async {
    _timer?.cancel();
    _status = GameStatus.analyzing;
    notifyListeners();

    _report = await aiService.analyzeFpsSimulation(telemetry);
    _status = GameStatus.completed;
    notifyListeners();
  }

  void resetToHome() {
    _timer?.cancel();
    _status = GameStatus.idle;
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
