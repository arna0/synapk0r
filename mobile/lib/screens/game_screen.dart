import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../widgets/three_d_fps_viewport.dart';

/// Uses the same simulator and debrief as the browser for every profession.
class GameScreen extends StatelessWidget {
  const GameScreen({super.key, this.module = 'barista'});

  final String module;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkSlate,
      appBar: AppBar(
        backgroundColor: AppTheme.darkSlate,
        foregroundColor: Colors.white,
        title: const Text('SynapKor'),
      ),
      body: SafeArea(
        top: false,
        child: ThreeDFpsViewport(
          module: module,
          onMessageReceived: (_) {},
        ),
      ),
    );
  }
}
