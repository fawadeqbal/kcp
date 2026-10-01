import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

void main() {
  Map<String, Object?> approvalJson() => {
    'memberId': 'member-1',
    'projectId': 'project-1',
    'title': 'Bakery website',
    'summary': 'A small website for a family bakery: menu, opening hours and a map.',
    'leadName': 'Bilal Khan',
    'note': null,
    'status': 'ACCEPTED',
    'taskTitle': 'Menu page',
    'estimateMinutes': 90,
    'estimatedEarningsMinor': 450000,
    'currency': 'PKR',
    'invitedAt': '2026-09-30T10:00:00Z',
    'childId': 'child-1',
    'nickname': 'Sara',
    'shareBp': 2500,
    'studentPercent': 50,
  };

  FakeApi parentServer(List<Map<String, Object?>> Function() approvals) {
    return FakeApi()
      ..on(
        'POST',
        '/v1/auth/login',
        (_) => FakeResponse({...loginJson(student: false), 'user': meJson(student: false)}),
      )
      ..on('GET', '/v1/children', (_) => FakeResponse([childJson()]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on('GET', '/v1/hub/approvals', (_) => FakeResponse(approvals()));
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'parent@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
  }

  testWidgets('a parent approves a paid hub project after the parental gate', (tester) async {
    var approvals = [approvalJson()];
    final api = parentServer(() => approvals)
      ..on('POST', '/v1/hub/approvals/{memberId}', (request) {
        expect(request.json, {'approve': true});
        approvals = [];
        return const FakeResponse.empty();
      });
    await pumpApp(tester, api);
    await signIn(tester);

    expect(find.text('Paid projects to approve'), findsOneWidget);
    expect(find.text('Sara wants to work on Bakery website'), findsOneWidget);
    expect(find.text('Task: Menu page'), findsOneWidget);
    expect(find.text('About 1 h 30 min of work'), findsOneWidget);
    expect(find.textContaining('4,500'), findsOneWidget);
    expect(find.text('Lead developer: Bilal Khan'), findsOneWidget);

    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Approve'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Approve'));
    await tester.pumpAndSettle();
    expect(find.text('For grown-ups'), findsOneWidget);
    await tester.enterText(find.byType(TextField).last, '105');
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    expect(api.called('POST', '/v1/hub/approvals/member-1'), hasLength(1));
    expect(find.text('Sara is on Bakery website.'), findsOneWidget);
    expect(find.text('Paid projects to approve'), findsNothing);
  });

  testWidgets('projects the child hasn’t accepted yet don’t ask the parent anything', (
    tester,
  ) async {
    final api = parentServer(
      () => [
        {...approvalJson(), 'status': 'INVITED'},
      ],
    );
    await pumpApp(tester, api);
    await signIn(tester);
    expect(find.text('Paid projects to approve'), findsNothing);
  });

  testWidgets('a child’s page shows their hub earnings, once there are some', (tester) async {
    final api = parentServer(() => [])
      ..on(
        'GET',
        '/v1/children/{childId}/hub/earnings',
        (_) => const FakeResponse({
          'totals': [
            {
              'currency': 'USD',
              'earnedMinor': 12500,
              'heldMinor': 2550,
              'payableMinor': 4000,
              'paidMinor': 6000,
              'withheldMinor': 0,
            },
          ],
          'earnings': [],
          'payouts': [],
        }),
      );
    await pumpApp(tester, api);
    await signIn(tester);
    await tester.tap(find.text('Sara'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Hub earnings'), 200);
    expect(find.text('Hub earnings'), findsOneWidget);
    expect(find.text('Earned'), findsOneWidget);
    expect(find.text(r'$125'), findsOneWidget);
    expect(find.text('Ready to pay out'), findsOneWidget);
    expect(find.text(r'$40'), findsOneWidget);
    expect(find.text(r'$25.50'), findsOneWidget);
  });

  testWidgets('no earnings, no card', (tester) async {
    final api = parentServer(() => [])
      ..on(
        'GET',
        '/v1/children/{childId}/hub/earnings',
        (_) => const FakeResponse({'totals': [], 'earnings': [], 'payouts': []}),
      );
    await pumpApp(tester, api);
    await signIn(tester);
    await tester.tap(find.text('Sara'));
    await tester.pumpAndSettle();
    expect(find.text('Hub earnings'), findsNothing);
  });
}
