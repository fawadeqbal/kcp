import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

/// A pretend server for one student's day: today's practice has five quizzes
/// (the first puts lines in order); finishing it meets the daily goal.
class StudentServer {
  StudentServer(this.api) {
    api
      ..on('POST', '/v1/auth/students/login', (request) {
        final body = request.json;
        if (body['app'] != 'mobile' || body['tokenDelivery'] != 'body') {
          return FakeResponse.error(400, 'BAD_REQUEST');
        }
        if (body['password'] != 'kid pass 42') {
          return FakeResponse.error(401, 'INVALID_CREDENTIALS');
        }
        return FakeResponse(loginJson());
      })
      ..on(
        'GET',
        '/v1/progress',
        (_) => FakeResponse(
          progressJson(xp: xp, todayXp: xp, streak: practiceDone ? 1 : 0, doneToday: xp >= 20),
        ),
      )
      ..on(
        'GET',
        '/v1/learning/practice',
        (_) => FakeResponse(practiceJson(quizzes, answered: answered.toList(), done: practiceDone)),
      )
      ..on('GET', '/v1/learning/tracks', (_) => FakeResponse(overviewJson()))
      ..on('POST', '/v1/learning/quizzes/{id}/answers', (request) {
        final id = request.params['id']!;
        final body = request.json;
        final correct = id == 'q1'
            ? (body['order'] as List?)?.join(',') == 'a1,b2,c3'
            : body['option'] == 'a';
        var award = 0;
        if (correct && answered.add(id)) award += 5;
        if (answered.length == quizzes.length && !practiceDone) {
          practiceDone = true;
          award += 20;
        }
        xp += award;
        return FakeResponse(
          resultJson(
            correct: correct,
            xp: award,
            explanation: correct ? 'Because.' : null,
            practice: {
              'day': '2026-10-01',
              'total': 5,
              'answered': answered.length,
              'done': practiceDone,
            },
          ),
        );
      });
  }

  final FakeApi api;
  final quizzes = [
    orderQuiz('q1'),
    for (final n in [2, 3, 4, 5]) choiceQuiz('q$n'),
  ];
  final answered = <String>{};
  bool practiceDone = false;
  int xp = 0;
}

void main() {
  testWidgets('a student signs in and keeps a streak alive using only the app', (tester) async {
    final api = FakeApi();
    final server = StudentServer(api);
    final (_, store) = await pumpApp(tester, api);

    // Welcome → student sign-in.
    await tester.tap(find.text("I'm a student"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'swift-falcon-4821');
    await tester.enterText(find.byType(TextFormField).at(1), 'wrong');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(find.text("That login name or password isn't right."), findsOneWidget);

    await tester.enterText(find.byType(TextFormField).at(1), 'kid pass 42');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(store.token, 'refresh-1');

    // Today: no streak yet, today's practice waiting.
    final semantics = tester.ensureSemantics();
    await tester.pump();
    expect(find.text('Hi, Sara!'), findsOneWidget);
    expect(find.bySemanticsLabel('No streak yet'), findsOneWidget);
    expect(find.text('5 quick questions · +20 XP'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('practice-row')));
    await tester.pumpAndSettle();
    expect(find.text('1 / 5'), findsOneWidget);
    expect(find.bySemanticsLabel('Question 1 of 5'), findsOneWidget);
    expect(find.text('CHECK YOURSELF'), findsOneWidget);

    // 1: put the lines in order with the arrow buttons.
    await tester.tap(find.byTooltip('Move line 1 down'));
    await tester.pump();
    await tester.tap(find.byTooltip('Move line 2 down'));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Check my answer'));
    await tester.pumpAndSettle();
    expect(find.text('Correct! +5 XP'), findsOneWidget);
    expect(find.text('Because.'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Next question'));
    await tester.pumpAndSettle();

    // 2 to 5: pick an answer; one wrong try first.
    await tester.tap(find.text('Wrong'));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Check my answer'));
    await tester.pumpAndSettle();
    expect(find.text('Not quite. Have another go.'), findsOneWidget);
    for (var n = 2; n <= 5; n++) {
      expect(find.text('Question q$n?'), findsOneWidget);
      expect(find.text('$n / 5'), findsOneWidget);
      await tester.tap(find.text('Right'));
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Check my answer'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, n == 5 ? 'Finish' : 'Next question'));
      await tester.pumpAndSettle();
    }

    // Done: the practice XP met the daily goal, so the streak started.
    expect(server.practiceDone, isTrue);
    expect(find.text('Practice done!'), findsOneWidget);
    expect(find.text('Your streak: 1 day. Keep it going tomorrow!'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Back home'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('1 day in a row'), findsOneWidget);
    expect(find.text("Today's goal is done. Your streak is safe!"), findsOneWidget);
    expect(find.text("Today's practice is done. See you tomorrow!"), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('students see lessons on the phone and are sent to the laptop for code', (
    tester,
  ) async {
    final api = FakeApi();
    StudentServer(api);
    api
      ..on('POST', '/v1/auth/refresh', (_) => FakeResponse(loginJson(access: 'a2', refresh: 'r2')))
      ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
      ..on(
        'POST',
        '/v1/learning/lessons/{id}/start',
        (_) => const FakeResponse({'lessonId': 'x', 'status': 'STARTED', 'completedAt': null}),
      )
      ..on(
        'GET',
        '/v1/learning/lessons/{id}',
        (request) => FakeResponse({
          'id': request.params['id'],
          'trackId': 'builder',
          'moduleId': 'builder-m01',
          'moduleTitle': 'Your first website',
          'number': 1,
          'lessonCount': 5,
          'title': 'Hello, HTML',
          'summary': 'Your first page',
          'body': 'Tags look like `<h1>`.\n\n```html\n<h1>Hello</h1>\n```',
          'language': 'en',
          'video': null,
          'xp': 20,
          'isPremium': false,
          'status': 'STARTED',
          'previousLessonId': null,
          'nextLessonId': null,
          'challenges': [
            {
              'id': 'c1',
              'title': 'Write a heading',
              'instructions': 'Do it',
              'type': 'HTML',
              'xp': 10,
              'files': ['html'],
              'starter': {'html': '', 'css': null, 'js': null, 'py': null},
              'stage': null,
              'repo': null,
              'checks': <Object>[],
              'hints': <String, String>{},
              'checkLabels': <String, String>{},
              'draft': null,
              'passed': false,
            },
          ],
          'quizzes': [choiceQuiz('q9')..remove('lessonTitle')],
        }),
      );
    await pumpApp(tester, api, refreshToken: 'r1');

    await tester.tap(find.text('Lessons'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Hello, HTML'));
    await tester.pumpAndSettle();

    expect(find.text('LESSON 1 OF 5'), findsOneWidget);
    expect(find.text('Check yourself'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Try it on your laptop'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Coding is on your laptop'), findsOneWidget);
    expect(find.text('app.test/en/learn/builder-m01-l01'), findsOneWidget);
    expect(api.called('POST', '/v1/learning/lessons/builder-m01-l01/start'), hasLength(1));
  });
}
