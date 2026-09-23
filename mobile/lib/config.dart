/// Build-time configuration.
///
/// Backend with AI feedback (see ../backend):
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8787   (Android emulator)
///   flutter build web --dart-define=API_BASE_URL=https://your-backend.example.com
/// Empty value = offline mode, the report is built by local rules only.
const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');
