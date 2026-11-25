import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/three_d_fps_viewport.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key, this.module = 'barista'});

  /// All modules use the simulator's shared report.
  final String module;

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkSlate,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: IconButton(
                tooltip: 'Выйти в меню',
                icon: const Icon(Icons.close_rounded, color: Colors.white),
                onPressed: () {
                  context.read<GameProvider>().resetToHome();
                  Navigator.pop(context);
                },
              ),
            ),
            Expanded(child: ThreeDFpsViewport(module: widget.module)),
          ],
        ),
      ),
    );
  }
}
