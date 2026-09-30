import 'dart:ui';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// The app's languages. Arabic and Urdu are right-to-left.
const supportedLanguages = ['en', 'ar', 'ur'];

/// Small settings kept on the phone (the chosen language). Overridden in main().
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider is set in main()'),
);

/// The first of the phone's languages the app speaks, else English.
String resolveLanguage(List<Locale> deviceLocales) {
  for (final locale in deviceLocales) {
    if (supportedLanguages.contains(locale.languageCode)) return locale.languageCode;
  }
  return 'en';
}

/// The language chosen in the app, or null to follow the phone.
class LanguageController extends Notifier<String?> {
  static const _key = 'kcp.language';

  @override
  String? build() {
    final saved = ref.watch(sharedPreferencesProvider).getString(_key);
    return supportedLanguages.contains(saved) ? saved : null;
  }

  Future<void> set(String? language) async {
    final prefs = ref.read(sharedPreferencesProvider);
    if (language == null) {
      await prefs.remove(_key);
    } else {
      await prefs.setString(_key, language);
    }
    state = language;
  }
}

final languageChoiceProvider = NotifierProvider<LanguageController, String?>(
  LanguageController.new,
);

/// The phone's languages (a provider, so tests can set them).
final deviceLocalesProvider = Provider<List<Locale>>((ref) => PlatformDispatcher.instance.locales);

/// The language the app shows now: en, ar or ur. API texts are asked for in it.
final appLanguageProvider = Provider<String>((ref) {
  return ref.watch(languageChoiceProvider) ?? resolveLanguage(ref.watch(deviceLocalesProvider));
});
