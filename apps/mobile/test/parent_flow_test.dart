import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

void main() {
  FakeApi parentServer({bool mustAcceptTerms = false}) {
    var child = childJson();
    final api = FakeApi();
    api
      ..on('POST', '/v1/auth/login', (request) {
        final body = request.json;
        if (body['email'] == 'staff@example.com') {
          return FakeResponse.error(403, 'NOT_FAMILY');
        }
        return FakeResponse({
          ...loginJson(student: false),
          'user': meJson(student: false, mustAcceptTerms: mustAcceptTerms),
        });
      })
      ..on('GET', '/v1/children', (_) => FakeResponse([child]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on('PUT', '/v1/children/{id}/consents', (request) {
        child = {...child, 'consents': request.json};
        return FakeResponse(child);
      })
      ..on('PATCH', '/v1/children/{id}', (request) {
        child = {...child, ...request.json};
        return FakeResponse(child);
      });
    return api;
  }

  Future<void> signInAsParent(WidgetTester tester, String email) async {
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), email);
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
  }

  testWidgets('staff accounts are sent to the admin panel', (tester) async {
    await pumpApp(tester, parentServer());
    await signInAsParent(tester, 'staff@example.com');
    expect(
      find.text('The app is for students and parents. Staff use the admin panel.'),
      findsOneWidget,
    );
  });

  testWidgets('a parent sees each child and changes a switch after the parental gate', (
    tester,
  ) async {
    final api = parentServer();
    await pumpApp(tester, api);
    await signInAsParent(tester, 'parent@example.com');

    expect(find.text('Hello, Amina'), findsOneWidget);
    expect(find.text('Sara'), findsOneWidget);
    // Level, days in a row and lessons done, on the child's card.
    expect(find.text('Days in a row'), findsOneWidget);
    expect(find.text('4'), findsOneWidget);
    expect(find.text('Lessons done'), findsOneWidget);
    // The plan's status only: no prices, and no way to buy, in the app.
    expect(find.text('No plan at the moment.'), findsOneWidget);
    expect(find.textContaining('PKR'), findsNothing);

    await tester.tap(find.text('Sara'));
    await tester.pumpAndSettle();
    expect(find.text('What you allow'), findsOneWidget);

    // A wrong answer three times: nothing changes.
    await tester.tap(find.text('Public leaderboards'));
    await tester.pumpAndSettle();
    expect(find.text('For grown-ups'), findsOneWidget);
    expect(find.text('What is fifteen times seven?'), findsOneWidget);
    for (var i = 0; i < 3; i++) {
      await tester.enterText(find.byType(TextField).last, '12');
      await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
      await tester.pumpAndSettle();
    }
    expect(find.text('For grown-ups'), findsNothing);
    expect(api.called('PUT', '/v1/children/child-1/consents'), isEmpty);

    // The right answer: the switch changes.
    await tester.tap(find.text('Public leaderboards'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '105');
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    final sent = api.called('PUT', '/v1/children/child-1/consents');
    expect(sent, hasLength(1));
    expect(sent.single.json, {'publicLeaderboards': true, 'publicPortfolio': false});
    expect(find.text('Saved.'), findsOneWidget);
    final leaderboards = tester.widget<SwitchListTile>(
      find.widgetWithText(SwitchListTile, 'Public leaderboards'),
    );
    expect(leaderboards.value, isTrue);

    // Streak reminders go through the same gate (once the message has gone).
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Streak reminder'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Streak reminder'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '105');
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    expect(api.called('PATCH', '/v1/children/child-1').single.json, {'streakReminders': false});
  });

  testWidgets('the streak reminder switches from the home screen, behind the gate', (tester) async {
    final api = parentServer();
    await pumpApp(tester, api);
    await signInAsParent(tester, 'parent@example.com');

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    expect(find.text('For grown-ups'), findsOneWidget);
    await tester.enterText(find.byType(TextField).last, '105');
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    expect(api.called('PATCH', '/v1/children/child-1').single.json, {'streakReminders': false});
    expect(tester.widget<Switch>(find.byType(Switch)).value, isFalse);
  });

  testWidgets('a parent is told when the terms changed', (tester) async {
    await pumpApp(tester, parentServer(mustAcceptTerms: true));
    await signInAsParent(tester, 'parent@example.com');
    expect(
      find.text(
        'Our terms and privacy policy have changed. Please read and accept them on the website.',
      ),
      findsOneWidget,
    );
  });
}
