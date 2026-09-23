import 'dart:js_interop';
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

/// Flutter Web: the simulator runs in an <iframe>; it reports back with window.postMessage.
class SimView extends StatefulWidget {
  const SimView({
    super.key,
    required this.module,
    required this.fallback,
    this.apiBaseUrl = '',
    this.onMessage,
  });

  /// 'barista' or 'safety'
  final String module;
  final String apiBaseUrl;
  final ValueChanged<String>? onMessage;
  final Widget fallback;

  @override
  State<SimView> createState() => _SimViewState();
}

class _SimViewState extends State<SimView> {
  static int _nextId = 0;
  late final String _viewType = 'synapkor-sim-${_nextId++}';
  JSFunction? _listener;

  @override
  void initState() {
    super.initState();

    // Flutter serves bundled assets under /assets/<asset path>
    final src = Uri(
      path: 'assets/assets/sim/index.html',
      queryParameters: {
        'module': widget.module,
        if (widget.apiBaseUrl.isNotEmpty) 'api': widget.apiBaseUrl,
      },
    ).toString();

    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final iframe = web.HTMLIFrameElement()
        ..src = src
        ..allow = 'fullscreen; autoplay'
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%';
      return iframe;
    });

    _listener = ((web.MessageEvent event) {
      // The simulator is served from the same origin as the app; ignore anything else
      if (event.origin != web.window.location.origin) return;
      final data = event.data;
      if (data != null && data.isA<JSString>()) {
        widget.onMessage?.call((data as JSString).toDart);
      }
    }).toJS;
    web.window.addEventListener('message', _listener);
  }

  @override
  void dispose() {
    if (_listener != null) web.window.removeEventListener('message', _listener);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: _viewType);
}
