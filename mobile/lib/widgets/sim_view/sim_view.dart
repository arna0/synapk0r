// Platform-specific embedding of the 3D web simulator (assets/sim/index.html):
// Android / iOS -> WebView, Flutter Web -> <iframe>.
export 'sim_view_io.dart' if (dart.library.js_interop) 'sim_view_web.dart';
