import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/game_provider.dart';
import 'screens/home_screen.dart';
import 'services/ai_analysis_service.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Immersive status bar setup
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppTheme.bgDark,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  runApp(const BaristaVRApp());
}

class BaristaVRApp extends StatelessWidget {
  const BaristaVRApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AiAnalysisService>(
          // Optional LLM report: flutter run --dart-define=GEMINI_API_KEY=...
          create: (_) => AiAnalysisService(
            apiKey: const String.fromEnvironment('GEMINI_API_KEY'),
          ),
        ),
        ChangeNotifierProvider<GameProvider>(
          create: (context) => GameProvider(
            aiService: context.read<AiAnalysisService>(),
          ),
        ),
      ],
      child: MaterialApp(
        title: 'SynapKor - Barista VR Edition',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const HomeScreen(),
      ),
    );
  }
}
