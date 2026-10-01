import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_app/features/rooms/room_screen.dart';
import 'package:kcp_app/router/router.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

Map<String, dynamic> roomJson({int unread = 0, bool canType = true, String? mutedUntil}) => {
  'id': 'room-1',
  'kind': 'TEAM',
  'name': 'Team Rocket',
  'unread': unread,
  'lastMessageAt': '2026-09-30T10:00:00Z',
  'canType': canType,
  'mutedUntil': mutedUntil,
  'archived': false,
};

Map<String, dynamic> messageJson(
  String id, {
  String authorId = 'student-2',
  String name = 'Zain',
  String? phrase,
  String? text,
  bool adult = false,
}) => {
  'id': id,
  'roomId': 'room-1',
  'author': {'id': authorId, 'name': name, 'avatarKey': adult ? null : 'cat', 'isAdult': adult},
  'kind': phrase != null ? 'PHRASE' : 'TEXT',
  'phraseKey': phrase,
  'text': text,
  'hidden': false,
  'createdAt': '2026-09-30T10:00:00Z',
};

void main() {
  testWidgets('a student opens their team room, sends a phrase and a text, and reports one', (
    tester,
  ) async {
    var messages = <Map<String, dynamic>>[
      messageJson('m1', phrase: 'hello'),
      messageJson('m2', text: 'Start with the heading.', name: 'Ms Khan', adult: true),
    ];
    final api = FakeApi()
      ..on('POST', '/v1/auth/refresh', (_) => FakeResponse(loginJson(access: 'a2', refresh: 'r2')))
      ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
      ..on('GET', '/v1/progress', (_) => FakeResponse(progressJson()))
      ..on('GET', '/v1/learning/practice', (_) => FakeResponse(practiceJson([])))
      ..on('GET', '/v1/badges', (_) => const FakeResponse({'badges': <Object>[]}))
      ..on('GET', '/v1/rooms', (_) => FakeResponse([roomJson(unread: 2)]))
      ..on(
        'GET',
        '/v1/rooms/{id}/messages',
        (_) => FakeResponse({'room': roomJson(unread: 2), 'messages': messages, 'hasMore': false}),
      )
      ..on('POST', '/v1/rooms/{id}/read', (_) => const FakeResponse.empty())
      ..on('POST', '/v1/rooms/{id}/messages', (request) {
        final body = request.json;
        final text = body['text'] as String?;
        if (text != null && text.contains('0300')) {
          return FakeResponse({
            'statusCode': 400,
            'error': 'MESSAGE_BLOCKED',
            'message': 'No',
            'details': {'reason': 'PHONE'},
          }, 400);
        }
        final sent = messageJson(
          'm${messages.length + 1}',
          authorId: 'student-1',
          name: 'Sara',
          phrase: body['phrase'] as String?,
          text: text,
        );
        messages = [...messages, sent];
        return FakeResponse(sent, 201);
      })
      ..on('POST', '/v1/rooms/{id}/reports', (_) => const FakeResponse({'id': 'report-1'}, 201));
    await pumpApp(tester, api, refreshToken: 'r1');

    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();
    expect(find.text('Team rooms'), findsOneWidget);
    expect(find.text('2 new messages'), findsOneWidget);
    await tester.tap(find.text('Team rooms'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Team Rocket'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Hello!'), findsWidgets);
    expect(find.text('Start with the heading.'), findsOneWidget);
    expect(find.text('Ms Khan · Grown-up · ${_clock(tester)}'), findsOneWidget);
    expect(api.called('POST', '/v1/rooms/room-1/read'), hasLength(1));

    await tester.ensureVisible(find.widgetWithText(ActionChip, 'Great job!'));
    await tester.pump();
    await tester.tap(find.widgetWithText(ActionChip, 'Great job!'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(api.called('POST', '/v1/rooms/room-1/messages').last.json, {'phrase': 'great-job'});
    expect(find.text('Great job!'), findsWidgets);

    await tester.enterText(find.byType(TextField), 'call 0300 1234567');
    await tester.tap(find.byTooltip('Send'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(
      find.text('Phone numbers can’t be sent in rooms. Keep your contact details private.'),
      findsOneWidget,
    );
    await tester.enterText(find.byType(TextField), 'I will do the header');
    await tester.tap(find.byTooltip('Send'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('I will do the header'), findsOneWidget);

    await tester.tap(find.byTooltip('Report this message from Zain'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('It scares or worries me'));
    await tester.ensureVisible(find.text('Send to a moderator'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Send to a moderator'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 700));
    expect(api.called('POST', '/v1/rooms/room-1/reports').single.json, {
      'messageId': 'm1',
      'reason': 'SCARY',
    });
    expect(find.text('Thanks for telling us. A moderator will look at it soon.'), findsOneWidget);
    // Leaving the room stops checking for messages.
    await tester.pageBack();
    await tester.pumpAndSettle();
  });

  testWidgets('under 13: phrases only; a muted student reads without sending', (tester) async {
    var room = roomJson(canType: false);
    final api = FakeApi()
      ..on('POST', '/v1/auth/refresh', (_) => FakeResponse(loginJson(access: 'a2', refresh: 'r2')))
      ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
      ..on('GET', '/v1/progress', (_) => FakeResponse(progressJson()))
      ..on('GET', '/v1/learning/practice', (_) => FakeResponse(practiceJson([])))
      ..on('GET', '/v1/rooms', (_) => FakeResponse([room]))
      ..on(
        'GET',
        '/v1/rooms/{id}/messages',
        (_) => FakeResponse({'room': room, 'messages': <Object>[], 'hasMore': false}),
      );
    final (container, _) = await pumpApp(tester, api, refreshToken: 'r1');
    unawaited(container.read(routerProvider).push('/rooms/room-1'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('No messages yet. Say hello!'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(
      find.text('You can send these phrases. From 13 you can type your own messages too.'),
      findsOneWidget,
    );

    room = roomJson(canType: false, mutedUntil: '2030-01-01T10:00:00Z');
    await tester.pump(roomPollInterval);
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.textContaining('A moderator paused your messages until'), findsOneWidget);
    expect(find.byType(ActionChip), findsNothing);
    container.read(routerProvider).pop();
    await tester.pumpAndSettle();
  });

  testWidgets('a parent reads their child\'s room, without writing', (tester) async {
    final api = FakeApi()
      ..on(
        'POST',
        '/v1/auth/login',
        (_) => FakeResponse({...loginJson(student: false), 'user': meJson(student: false)}),
      )
      ..on('GET', '/v1/children', (_) => FakeResponse([childJson()]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on('GET', '/v1/children/{id}/rooms', (_) => FakeResponse([roomJson(unread: 0)]))
      ..on(
        'GET',
        '/v1/children/{childId}/rooms/{roomId}/messages',
        (_) => FakeResponse({
          'room': roomJson(),
          'messages': [messageJson('m1', text: 'See you at 5')],
          'hasMore': false,
        }),
      );
    // Tall enough for the child's whole screen.
    await pumpApp(tester, api, size: const Size(1080, 7200));
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'parent@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sara'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Team Rocket'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('See you at 5'), findsOneWidget);
    expect(find.textContaining('You can read this room; you can’t write in it.'), findsOneWidget);
    expect(find.byType(ActionChip), findsNothing);
    expect(find.byTooltip('Report this message from Zain'), findsNothing);
    await tester.pageBack();
    await tester.pumpAndSettle();
  });
}

/// The time the fixtures' messages were sent, as the phone shows it.
String _clock(WidgetTester tester) {
  final context = tester.element(find.byType(Scaffold).last);
  final local = DateTime.parse('2026-09-30T10:00:00Z').toLocal();
  final l = MaterialLocalizations.of(context);
  final clock = l.formatTimeOfDay(TimeOfDay.fromDateTime(local));
  final now = DateTime.now();
  return local.year == now.year && local.month == now.month && local.day == now.day
      ? clock
      : '${l.formatShortMonthDay(local)} $clock';
}
