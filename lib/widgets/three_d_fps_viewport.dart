import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../theme/app_theme.dart';

class ThreeDFpsViewport extends StatefulWidget {
  final Function(String eventData)? onMessageReceived;
  final VoidCallback? onObjectInteracted;

  const ThreeDFpsViewport({
    super.key,
    this.onMessageReceived,
    this.onObjectInteracted,
  });

  @override
  State<ThreeDFpsViewport> createState() => _ThreeDFpsViewportState();
}

class _ThreeDFpsViewportState extends State<ThreeDFpsViewport> with SingleTickerProviderStateMixin {
  WebViewController? _webViewController;
  bool _isLoading = true;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _initWebView();
  }

  void _initWebView() {
    try {
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.transparent)
        ..addJavaScriptChannel(
          'FlutterChannel',
          onMessageReceived: (JavaScriptMessage message) {
            widget.onMessageReceived?.call(message.message);
          },
        )
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageFinished: (String url) {
              if (mounted) setState(() => _isLoading = false);
            },
            onWebResourceError: (error) {
              if (mounted) setState(() => _isLoading = false);
            },
          ),
        );

      // Load localhost or direct HTML string
      controller.loadRequest(Uri.parse('http://localhost:8080'));
      _webViewController = controller;
    } catch (_) {
      // WebView not supported on current platform
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // 3D WebView
        if (_webViewController != null && !kIsWeb)
          WebViewWidget(controller: _webViewController!)
        else
          _buildPureFlutter3DView(),

        // Loading indicator
        if (_isLoading)
          Container(
            color: AppTheme.darkSlate,
            child: const Center(
              child: SizedBox(
                width: 32,
                height: 32,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: AppTheme.primaryBlue,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildPureFlutter3DView() {
    return Container(
      color: const Color(0xFF0F172A),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // 3D Bar Counter visualization
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 180,
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xFF1E293B),
                border: Border(
                  top: BorderSide(color: Color(0xFF334155), width: 1),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildMachineNode('☕ Холдер', AppTheme.primaryBlue),
                  _buildMachineNode('⚙️ Кофемолка', const Color(0xFF94A3B8)),
                  _buildMachineNode('🔽 Темпер', AppTheme.amberWarning),
                  _buildMachineNode('⚡ Машина', AppTheme.emeraldGreen),
                ],
              ),
            ),
          ),

          // FPS Hands overlay
          Positioned(
            bottom: 12,
            right: 24,
            child: AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(0, _pulseController.value * 4),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A).withOpacity(0.9),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🧤 ', style: TextStyle(fontSize: 14)),
                        Text(
                          'FPS VR HANDS ACTIVE',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF94A3B8),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMachineNode(String title, Color accentColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Text(
        title,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }
}
