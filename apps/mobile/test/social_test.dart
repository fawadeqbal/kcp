import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_app/features/social/friends_view.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

Map<String, dynamic> standing(
  int rank,
  String? nickname,
  int xp, {
  bool isMe = false,
  bool isFriend = false,
  String? zone,
}) => {
  'rank': rank,
  'nickname': nickname,
  'avatarKey': nickname == null ? null : 'rocket',
  'xp': xp,
  'isMe': isMe,
  'isFriend': isFriend,
  'zone': zone,
};

Map<String, dynamic> leagueJson({bool seen = false}) => {
  'tier': 'silver',
  'tierIndex': 1,
  'week': {'key': '2026-W40', 'startDay': '2026-09-28', 'endDay': '2026-10-05'},
  'joined': true,
  'standings': [
    standing(1, 'Ali', 60, zone: 'up'),
    standing(2, null, 40, zone: 'up'),
    standing(3, 'Sara', 30, isMe: true, zone: 'up'),
    standing(4, 'Zain', 10, isFriend: true, zone: 'up'),
  ],
  'promoteCount': 4,
  'relegateCount': 0,
  'lastResult': seen
      ? null
      : {
          'weekKey': '2026-W39',
          'tier': 'bronze',
          'rank': 2,
          'outcome': 'PROMOTED',
          'newTier': 'silver',
        },
};

Map<String, dynamic> friendsJson({List<Map<String, dynamic>> sent = const []}) => {
  'code': 'K7MQ4X',
  'friends': [
    {'userId': 'friend-1', 'nickname': 'Zain', 'avatarKey': 'cat', 'since': '2026-09-20T10:00:00Z'},
  ],
  'sent': sent,
  'received': <Object>[],
};

void main() {
  testWidgets('a student sees their league, last week\'s result, and adds a friend by code', (
    tester,
  ) async {
    var seen = false;
    var sent = <Map<String, dynamic>>[];
    final api = FakeApi()
      ..on('POST', '/v1/auth/refresh', (_) => FakeResponse(loginJson(access: 'a2', refresh: 'r2')))
      ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
      ..on('GET', '/v1/progress', (_) => FakeResponse(progressJson()))
      ..on('GET', '/v1/learning/practice', (_) => FakeResponse(practiceJson([])))
      ..on('GET', '/v1/league', (_) => FakeResponse(leagueJson(seen: seen)))
      ..on('POST', '/v1/league/seen', (_) {
        seen = true;
        return const FakeResponse.empty();
      })
      ..on('GET', '/v1/friends', (_) => FakeResponse(friendsJson(sent: sent)))
      ..on(
        'GET',
        '/v1/friends/board',
        (_) => const FakeResponse({
          'week': {'key': '2026-W40', 'startDay': '2026-09-28', 'endDay': '2026-10-05'},
          'entries': [
            {
              'rank': 1,
              'userId': 'student-1',
              'nickname': 'Sara',
              'avatarKey': 'rocket',
              'xp': 30,
              'isMe': true,
            },
            {
              'rank': 2,
              'userId': 'friend-1',
              'nickname': 'Zain',
              'avatarKey': 'cat',
              'xp': 10,
              'isMe': false,
            },
          ],
        }),
      )
      ..on('POST', '/v1/friends/requests', (request) {
        final code = (request.json['code'] as String).toUpperCase().replaceAll(' ', '');
        if (code != 'ABC234') return FakeResponse.error(404, 'FRIEND_CODE_NOT_FOUND');
        final created = {
          'id': 'request-1',
          'nickname': 'Hina',
          'avatarKey': 'star',
          'status': 'PENDING',
          'createdAt': '2026-09-30T10:00:00Z',
        };
        sent = [created];
        return FakeResponse(created);
      });
    await pumpApp(tester, api, refreshToken: 'r1');

    await tester.tap(find.text('League').last);
    await tester.pumpAndSettle();
    expect(find.text('Silver league'), findsOneWidget);
    expect(
      find.text('Last week you finished #2 in the Bronze league and moved up to Silver!'),
      findsOneWidget,
    );
    // Hidden by their parent: "A player"; friends by name.
    expect(find.text('A player'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Friend'),
      200,
      scrollable: find.byType(Scrollable).at(1),
    );
    expect(find.text('Friend'), findsOneWidget);
    expect(find.text('The top 4 move up to Gold.'), findsOneWidget);
    await tester.tap(find.text('Nice!'));
    await tester.pumpAndSettle();
    expect(seen, isTrue);
    expect(find.textContaining('Last week'), findsNothing);

    // Friends: the code to give out, a wrong code, then a friend's.
    await tester.tap(find.text('Friends'));
    await tester.pumpAndSettle();
    expect(tester.widget<SelectableText>(find.byType(SelectableText)).data, 'K7M Q4X');
    await tester.enterText(find.byType(TextField), 'zzz999');
    await tester.tap(find.text('Send request'));
    await tester.pumpAndSettle();
    expect(find.text('No one has that code. Check it and try again.'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'abc 234');
    await tester.tap(find.text('Send request'));
    await tester.pumpAndSettle();
    expect(
      find.text('Sent! You and Hina become friends once a parent of each of you says yes.'),
      findsOneWidget,
    );
    expect(find.text('You asked Hina'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('This week with friends'),
      200,
      scrollable: find
          .descendant(of: find.byType(FriendsView), matching: find.byType(Scrollable))
          .first,
    );
    await tester.pumpAndSettle();
    expect(find.text('Sara (You)'), findsOneWidget);
  });

  testWidgets('a parent approves a friend request after the parental gate', (tester) async {
    var requests = [
      {
        'id': 'request-1',
        'child': {'id': 'child-1', 'nickname': 'Sara', 'avatarKey': 'rocket'},
        'other': {'nickname': 'Hina', 'avatarKey': 'star'},
        'direction': 'received',
        'waitingForYou': true,
        'waitingForOtherFamily': false,
        'createdAt': '2026-09-30T10:00:00Z',
      },
    ];
    final api = FakeApi()
      ..on(
        'POST',
        '/v1/auth/login',
        (_) => FakeResponse({...loginJson(student: false), 'user': meJson(student: false)}),
      )
      ..on('GET', '/v1/children', (_) => FakeResponse([childJson()]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on('GET', '/v1/friend-requests', (_) => FakeResponse(requests))
      ..on('POST', '/v1/friend-requests/{id}/decision', (request) {
        expect(request.json, {'approve': true});
        requests = [];
        return const FakeResponse({'status': 'APPROVED'});
      });
    await pumpApp(tester, api);
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'parent@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Friend requests'), findsOneWidget);
    expect(find.text('Hina wants to be friends with Sara'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Approve'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '105');
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    expect(api.called('POST', '/v1/friend-requests/request-1/decision'), hasLength(1));
    expect(find.text('Sara and Hina are friends now.'), findsOneWidget);
    expect(find.text('Friend requests'), findsNothing);
  });
  testWidgets('a parent approves a hackathon team place after the parental gate', (tester) async {
    var requests = [
      {
        'teamId': 'team-1',
        'child': {'id': 'child-1', 'nickname': 'Sara', 'avatarKey': 'rocket'},
        'event': {
          'slug': 'club-jam',
          'title': 'Club Jam',
          'startsAt': '2026-10-10T09:00:00Z',
          'endsAt': '2026-10-12T17:00:00Z',
        },
        'team': {
          'name': 'Code Comets',
          'members': ['Hina'],
        },
        'requestedAt': '2026-09-30T10:00:00Z',
      },
    ];
    final api = FakeApi()
      ..on(
        'POST',
        '/v1/auth/login',
        (_) => FakeResponse({...loginJson(student: false), 'user': meJson(student: false)}),
      )
      ..on('GET', '/v1/children', (_) => FakeResponse([childJson()]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on('GET', '/v1/friend-requests', (_) => const FakeResponse([]))
      ..on('GET', '/v1/event-requests', (_) => FakeResponse(requests))
      ..on('POST', '/v1/event-requests/{teamId}/decision', (request) {
        expect(request.json, {'childId': 'child-1', 'approve': true});
        requests = [];
        return const FakeResponse({'status': 'APPROVED'});
      });
    await pumpApp(tester, api);
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'parent@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Hackathon teams'), findsOneWidget);
    expect(find.text('Sara wants to join Code Comets in Club Jam'), findsOneWidget);
    expect(find.textContaining('with Hina'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Approve'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '105');
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    expect(api.called('POST', '/v1/event-requests/team-1/decision'), hasLength(1));
    expect(find.text('Sara is in Code Comets.'), findsOneWidget);
    expect(find.text('Hackathon teams'), findsNothing);
  });
  testWidgets('a parent approves a place in a teacher’s class after the parental gate', (
    tester,
  ) async {
    var requests = [
      {
        'classId': 'class-1',
        'child': {'id': 'child-1', 'nickname': 'Sara', 'avatarKey': 'rocket'},
        'className': 'Grade 7 Blue',
        'school': 'Crescent School',
        'teacher': 'Ms Aslam',
        'requestedAt': '2026-09-30T10:00:00Z',
      },
    ];
    final api = FakeApi()
      ..on(
        'POST',
        '/v1/auth/login',
        (_) => FakeResponse({...loginJson(student: false), 'user': meJson(student: false)}),
      )
      ..on('GET', '/v1/children', (_) => FakeResponse([childJson()]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on('GET', '/v1/friend-requests', (_) => const FakeResponse([]))
      ..on('GET', '/v1/event-requests', (_) => const FakeResponse([]))
      ..on('GET', '/v1/class-requests', (_) => FakeResponse(requests))
      ..on('POST', '/v1/class-requests/{classId}/decision', (request) {
        expect(request.json, {'childId': 'child-1', 'approve': true});
        requests = [];
        return const FakeResponse({'status': 'APPROVED'});
      });
    await pumpApp(tester, api);
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'parent@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Class requests'), findsOneWidget);
    expect(find.text('Sara wants to join Grade 7 Blue at Crescent School'), findsOneWidget);
    expect(find.text('Teacher: Ms Aslam'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Approve'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '105');
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    expect(api.called('POST', '/v1/class-requests/class-1/decision'), hasLength(1));
    expect(find.text('Sara is in Grade 7 Blue.'), findsOneWidget);
    expect(find.text('Class requests'), findsNothing);
  });
}
