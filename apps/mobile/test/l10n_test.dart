import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _arb(String language) =>
    jsonDecode(File('lib/l10n/app_$language.arb').readAsStringSync()) as Map<String, dynamic>;

void main() {
  final en = _arb('en');
  final keys = en.keys.where((key) => !key.startsWith('@')).toSet();

  for (final language in ['ar', 'ur']) {
    test('$language has every English text, with the same placeholders', () {
      final translated = _arb(language);
      final translatedKeys = translated.keys.where((key) => !key.startsWith('@')).toSet();
      expect(translatedKeys.difference(keys), isEmpty, reason: 'texts English no longer has');
      expect(keys.difference(translatedKeys), isEmpty, reason: 'texts missing in $language');
      for (final key in keys) {
        final placeholders =
            ((en['@$key'] as Map<String, dynamic>?)?['placeholders'] as Map<String, dynamic>?)
                ?.keys ??
            const <String>[];
        for (final placeholder in placeholders) {
          expect(
            (translated[key] as String).contains('{$placeholder'),
            isTrue,
            reason: '$language "$key" lost {$placeholder}',
          );
        }
      }
    });
  }

  test('the parental gate has the number words 0 to 19 in every language', () {
    for (final language in ['en', 'ar', 'ur']) {
      expect((_arb(language)['gateNumberWords'] as String).split(','), hasLength(20));
    }
  });
}
