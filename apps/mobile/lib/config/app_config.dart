import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Firebase's settings for push notifications (from the Firebase console). Push
/// stays off until they are filled in: the app then works without it.
class FirebaseConfig {
  const FirebaseConfig({
    required this.projectId,
    required this.senderId,
    required this.apiKey,
    required this.androidAppId,
    required this.iosAppId,
  });

  final String projectId;
  final String senderId;
  final String apiKey;
  final String androidAppId;
  final String iosAppId;
}

/// Settings baked into each build: `--dart-define-from-file=config/<flavour>.json`
/// (dev, staging or prod). Nothing secret goes in them: they ship inside the app.
class AppConfig {
  const AppConfig({
    required this.flavor,
    required this.apiUrl,
    required this.webUrl,
    this.firebase,
  });

  /// dev, staging or prod.
  final String flavor;

  /// The API, e.g. https://api.kidscoding.example (no trailing slash).
  final String apiUrl;

  /// The student and parent website, for links and "continue on your laptop".
  final String webUrl;

  final FirebaseConfig? firebase;

  bool get isProduction => flavor == 'prod';

  factory AppConfig.fromEnvironment() {
    const projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
    const senderId = String.fromEnvironment('FIREBASE_SENDER_ID');
    const apiKey = String.fromEnvironment('FIREBASE_API_KEY');
    const androidAppId = String.fromEnvironment('FIREBASE_ANDROID_APP_ID');
    const iosAppId = String.fromEnvironment('FIREBASE_IOS_APP_ID');
    final hasFirebase = projectId.isNotEmpty && senderId.isNotEmpty && apiKey.isNotEmpty;
    return AppConfig(
      flavor: const String.fromEnvironment('FLAVOR', defaultValue: 'dev'),
      apiUrl: _trimSlash(
        const String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000'),
      ),
      webUrl: _trimSlash(
        const String.fromEnvironment('WEB_URL', defaultValue: 'http://10.0.2.2:3001'),
      ),
      firebase: hasFirebase
          ? const FirebaseConfig(
              projectId: projectId,
              senderId: senderId,
              apiKey: apiKey,
              androidAppId: androidAppId,
              iosAppId: iosAppId,
            )
          : null,
    );
  }

  /// A page of the website in a language, e.g. webPage('ur', '/privacy').
  Uri webPage(String language, String path) => Uri.parse('$webUrl/$language$path');

  static String _trimSlash(String url) =>
      url.endsWith('/') ? url.substring(0, url.length - 1) : url;
}

/// The build's settings. Tests override it.
final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment());
