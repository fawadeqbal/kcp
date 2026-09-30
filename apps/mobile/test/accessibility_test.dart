import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

Future<void> meetsGuidelines(WidgetTester tester) async {
  final handle = tester.ensureSemantics();
  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
  await expectLater(tester, meetsGuideline(textContrastGuideline));
  handle.dispose();
}

FakeApi _server() => FakeApi()
  ..on('POST', '/v1/auth/refresh', (_) => FakeResponse(loginJson(access: 'a2', refresh: 'r2')))
  ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
  ..on('GET', '/v1/progress', (_) => FakeResponse(progressJson(xp: 40, todayXp: 10, streak: 3)))
  ..on(
    'GET',
    '/v1/learning/practice',
    (_) => FakeResponse(practiceJson([orderQuiz('q1'), choiceQuiz('q2')])),
  )
  ..on('GET', '/v1/learning/tracks', (_) => FakeResponse(overviewJson()));

FakeApi _parentServer() => FakeApi()
  ..on(
    'POST',
    '/v1/auth/refresh',
    (_) => FakeResponse(loginJson(student: false, access: 'a2', refresh: 'r2')),
  )
  ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson(student: false)))
  ..on('GET', '/v1/children', (_) => FakeResponse([childJson()]))
  ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()));

void main() {
  for (final language in ['en', 'ar', 'ur']) {
    testWidgets('welcome and sign-in screens are accessible ($language)', (tester) async {
      await pumpApp(tester, FakeApi(), language: language);
      await meetsGuidelines(tester);
      await tester.tap(find.byType(FilledButton).first);
      await tester.pumpAndSettle();
      await meetsGuidelines(tester);
    });

    testWidgets('today and the practice are accessible ($language)', (tester) async {
      await pumpApp(tester, _server(), refreshToken: 'r1', language: language);
      await meetsGuidelines(tester);
      await tester.tap(find.byKey(const ValueKey('practice-row')));
      await tester.pumpAndSettle();
      await meetsGuidelines(tester);
    });
  }

  for (final language in ['en', 'ar', 'ur']) {
    testWidgets('large text fits on today and the practice ($language)', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await pumpApp(tester, _server(), refreshToken: 'r1', language: language);
      // A layout overflow would have failed the test by now.
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('practice-row')),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(tester.takeException(), isNull);
      await tester.tap(find.byKey(const ValueKey('practice-row')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }

  for (final language in ['en', 'ar', 'ur']) {
    testWidgets('the parent screens are accessible, also with large text ($language)', (
      tester,
    ) async {
      await pumpApp(tester, _parentServer(), refreshToken: 'r1', language: language);
      await meetsGuidelines(tester);
      await tester.tap(find.text('Sara'));
      await tester.pumpAndSettle();
      await meetsGuidelines(tester);

      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('Arabic and Urdu lay out right to left', (tester) async {
    await pumpApp(tester, FakeApi(), language: 'ur');
    expect(Directionality.of(tester.element(find.byType(Scaffold).first)), TextDirection.rtl);
  });
}
