import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Android / iOS: the simulator runs in a WebView and talks back via `FlutterChannel`.
class SimView extends StatefulWidget {
  const SimView({
    super.key,
    required this.module,
    required this.fallback,
    this.apiBaseUrl = '',
    this.onMessage,
  });

  /// 'barista', 'safety', 'it' or 'doctor'
  final String module;
  final String apiBaseUrl;
  final ValueChanged<String>? onMessage;

  /// Shown on platforms without WebView support (desktop).
  final Widget fallback;

  @override
  State<SimView> createState() => _SimViewState();
}

class _SimViewState extends State<SimView> {
  WebViewController? _controller;
  bool _loading = true;

  bool get _supported => Platform.isAndroid || Platform.isIOS;

  @override
  void initState() {
    super.initState();
    if (_supported) _initWebView();
  }

  void _initWebView() {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF15181D))
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: (message) => widget.onMessage?.call(message.message),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            final module = jsonEncode(widget.module);
            final api = widget.apiBaseUrl.isEmpty ? '' : 'window.SYNAPKOR_API_BASE = ${jsonEncode(widget.apiBaseUrl)};';
            // barista and safety have their own entry points; it and doctor run on the scenario engine
            _controller?.runJavaScript('$api '
                'if (window.syncSurveyQueue) syncSurveyQueue(); '
                'if ($module === "barista" && window.startBaristaVR) startBaristaVR(); '
                'else if ($module === "safety" && window.startSafetyVR) startSafetyVR(); '
                'else if (window.startScenario) startScenario($module);');
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (_) {
            if (mounted) setState(() => _loading = false);
          },
        ),
      )
      ..loadFlutterAsset('assets/sim/index.html');
    _controller = controller;
  }

  @override
  Widget build(BuildContext context) {
    if (!_supported || _controller == null) return widget.fallback;
    return Stack(
      children: [
        WebViewWidget(controller: _controller!),
        if (_loading) const Center(child: CircularProgressIndicator(strokeWidth: 3)),
      ],
    );
  }
}
