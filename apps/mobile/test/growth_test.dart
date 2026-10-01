import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_app/router/router.dart';
import 'package:kcp_app/widgets/activity_heartbeat.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

Map<String, dynamic> skillMapJson() => {
  'categories': [
    {
      'key': 'logic',
      'skills': [
        {
          'key': 'loops',
          'name': 'Repeating (loops)',
          'lessonsDone': 1,
          'lessonsTotal': 1,
          'learned': true,
        },
        {'key': 'events', 'name': 'Events', 'lessonsDone': 0, 'lessonsTotal': 1, 'learned': false},
      ],
    },
  ],
  'learned': 1,
  'total': 2,
};

FakeApi studentServer() => FakeApi()
  ..on('POST', '/v1/auth/refresh', (_) => FakeResponse(loginJson(access: 'a2', refresh: 'r2')))
  ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
  ..on('GET', '/v1/progress', (_) => FakeResponse(progressJson()))
  ..on('GET', '/v1/learning/practice', (_) => FakeResponse(practiceJson([choiceQuiz('q1')])))
  ..on('GET', '/v1/badges', (_) => const FakeResponse({'badges': <Object>[]}))
  ..on('GET', '/v1/skills', (_) => FakeResponse(skillMapJson()))
  ..on('POST', '/v1/activity/heartbeat', (_) => const FakeResponse.empty());

void main() {
  testWidgets('a student sees their skill map on the Me tab', (tester) async {
    final semantics = tester.ensureSemantics();
    await pumpApp(tester, studentServer(), refreshToken: 'r1');
    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();
    expect(find.text('My skills'), findsOneWidget);
    expect(find.text('1 of 2 skills'), findsOneWidget);
    expect(find.text('Thinking like a coder'), findsOneWidget);
    expect(find.bySemanticsLabel('Repeating (loops): Learned'), findsOneWidget);
    expect(find.bySemanticsLabel('Events: Not yet'), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('today\'s practice counts minutes once a minute while open', (tester) async {
    final api = studentServer();
    final (container, _) = await pumpApp(tester, api, refreshToken: 'r1');
    unawaited(container.read(routerProvider).push('/practice'));
    await tester.pumpAndSettle();
    expect(api.called('POST', '/v1/activity/heartbeat'), isEmpty);
    await tester.pump(activityHeartbeat);
    await tester.pump(activityHeartbeat);
    await tester.pumpAndSettle();
    expect(api.called('POST', '/v1/activity/heartbeat'), hasLength(2));
    // Leaving practice stops it.
    container.read(routerProvider).pop();
    await tester.pumpAndSettle();
    await tester.pump(activityHeartbeat);
    expect(api.called('POST', '/v1/activity/heartbeat'), hasLength(2));
  });

  testWidgets('a parent sees the last weekly report on their home', (tester) async {
    final api = FakeApi()
      ..on(
        'POST',
        '/v1/auth/login',
        (_) => FakeResponse({...loginJson(student: false), 'user': meJson(student: false)}),
      )
      ..on('GET', '/v1/children', (_) => FakeResponse([childJson()]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on(
        'GET',
        '/v1/reports',
        (_) => const FakeResponse({
          'reports': [
            {
              'weekKey': '2026-W40',
              'startDay': '2026-09-28',
              'endDay': '2026-10-05',
              'createdAt': '2026-10-04T12:00:00Z',
              'skillNames': {'loops': 'Repeating (loops)'},
              'children': [
                {
                  'childId': 'child-1',
                  'nickname': 'Sara',
                  'avatarKey': 'rocket',
                  'minutes': 42,
                  'xp': 60,
                  'lessons': 2,
                  'projects': 0,
                  'badges': 1,
                  'streak': 3,
                  'league': 'silver',
                  'skills': ['loops'],
                  'days': [10, 0, 12, 5, 15, 0, 0],
                },
              ],
            },
          ],
        }),
      );
    await pumpApp(tester, api);
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'parent@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Last weekly report'), findsOneWidget);
    expect(find.text('42 min · 60 XP · 2 lessons'), findsOneWidget);
    expect(find.text('New skills: Repeating (loops)'), findsOneWidget);
  });
}
