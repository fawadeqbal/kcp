import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_app/config/preferences.dart';
import 'package:kcp_app/features/login/login_screen.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

/// The API for a young student's first day: picture sign-in and a parent's phone.
FakeApi youngServer() {
  var pairingStatus = 'waiting';
  return FakeApi()
    ..on('POST', '/v1/auth/students/picture-login', (request) {
      final body = request.json;
      if (body['app'] != 'mobile' || body['tokenDelivery'] != 'body') {
        return FakeResponse.error(400, 'BAD_REQUEST');
      }
      if (body['username'] != 'swift-falcon-4821') {
        return FakeResponse.error(401, 'INVALID_CREDENTIALS');
      }
      if ((body['pictures'] as List).join(',') != 'cat,sun,cat,car') {
        return FakeResponse.error(401, 'INVALID_CREDENTIALS');
      }
      return FakeResponse(loginJson());
    })
    ..on('POST', '/v1/auth/pairing', (request) {
      expect(request.json, {'app': 'mobile'});
      pairingStatus = 'waiting';
      return const FakeResponse({
        'pairingId': 'pairing-1',
        'code': 'K7MQ4XPR',
        'secret': 'device-secret',
        'expiresAt': '2099-01-01T00:00:00.000Z',
      });
    })
    ..on('POST', '/v1/auth/pairing/status', (request) {
      expect(request.json, {'pairingId': 'pairing-1', 'secret': 'device-secret'});
      final status = pairingStatus;
      // The parent approves while the device waits.
      pairingStatus = 'approved';
      return FakeResponse({'status': status});
    })
    ..on('POST', '/v1/auth/pairing/claim', (request) {
      expect(request.json, {
        'pairingId': 'pairing-1',
        'secret': 'device-secret',
        'tokenDelivery': 'body',
        'app': 'mobile',
      });
      return FakeResponse(loginJson(refresh: 'paired-refresh'));
    })
    ..on('GET', '/v1/progress', (_) => FakeResponse(progressJson()))
    ..on('GET', '/v1/learning/practice', (_) => FakeResponse(practiceJson([])))
    ..on('GET', '/v1/learning/tracks', (_) => FakeResponse(overviewJson()));
}

Future<void> openStudentTab(WidgetTester tester, String tab) async {
  await tester.tap(find.text("I'm a student"));
  await tester.pumpAndSettle();
  await tester.tap(find.text(tab));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
}

Future<void> tapPictures(WidgetTester tester, List<String> pictures) async {
  for (final picture in pictures) {
    await tester.tap(find.byKey(ValueKey('picture-$picture')));
    await tester.pump();
  }
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('a young student signs in with four pictures', (tester) async {
    final api = youngServer();
    final (container, store) = await pumpApp(tester, api);
    await openStudentTab(tester, 'Pictures');
    expect(
      find.text('Type your login name, then tap your four pictures in order.'),
      findsOneWidget,
    );

    await tester.enterText(find.byType(TextField), 'Swift-Falcon-4821 ');
    await tapPictures(tester, ['cat', 'sun', 'dog', 'car']);
    expect(find.text("Those pictures aren't right. Try again!"), findsOneWidget);
    expect(store.token, isNull);

    // Undo takes back the last picture.
    await tester.tap(find.byKey(const ValueKey('picture-moon')));
    await tester.pump();
    await tester.tap(find.text('Undo'));
    await tester.pump();
    await tapPictures(tester, ['cat', 'sun', 'cat', 'car']);
    final sent = api.called('POST', '/v1/auth/students/picture-login').last.json;
    expect(sent['username'], 'swift-falcon-4821');
    expect(sent['pictures'], ['cat', 'sun', 'cat', 'car']);
    expect(store.token, 'refresh-1');
    expect(find.text('Hi, Sara!'), findsOneWidget);
    // Next time, the login name is already there.
    expect(
      container.read(sharedPreferencesProvider).getString('kcp.lastStudent'),
      'swift-falcon-4821',
    );
  });

  testWidgets('a child’s tablet signs in when a parent approves it on their phone', (tester) async {
    final api = youngServer();
    final (_, store) = await pumpApp(tester, api);
    await openStudentTab(tester, "Parent's phone");
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 100));
    // The code, spaced to read out, and as a QR code of the website's /pair page.
    expect(tester.widget<SelectableText>(find.byType(SelectableText)).data, 'K7MQ 4XPR');
    expect(tester.widget<QrImageView>(find.byType(QrImageView)), isA<QrImageView>());
    expect(find.text('Waiting for your parent…'), findsOneWidget);
    expect(
      find.text(
        'Ask your parent to scan this code with their phone, or to open app.test/en/pair and type the code.',
      ),
      findsOneWidget,
    );

    // The device asks every few seconds: waiting, then approved → signed in.
    await tester.pump(pairingPollInterval);
    await tester.pump();
    expect(api.called('POST', '/v1/auth/pairing/claim'), isEmpty);
    await tester.pump(pairingPollInterval);
    await tester.pumpAndSettle();
    expect(api.called('POST', '/v1/auth/pairing/claim'), hasLength(1));
    expect(store.token, 'paired-refresh');
    expect(find.text('Hi, Sara!'), findsOneWidget);
  });

  testWidgets('a parent signs in their child’s device from the app', (tester) async {
    final api = FakeApi()
      ..on(
        'POST',
        '/v1/auth/login',
        (_) => FakeResponse({...loginJson(student: false), 'user': meJson(student: false)}),
      )
      ..on('GET', '/v1/children', (_) => FakeResponse([childJson()]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on('POST', '/v1/auth/pairing/lookup', (request) {
        if (request.json['code'] != 'K7MQ4XPR') return FakeResponse.error(404, 'PAIRING_NOT_FOUND');
        return const FakeResponse({
          'device': 'The app on Android',
          'createdAt': '2026-10-01T10:00:00.000Z',
          'expiresAt': '2026-10-01T10:10:00.000Z',
        });
      })
      ..on('POST', '/v1/auth/pairing/approve', (_) => const FakeResponse.empty());
    await pumpApp(tester, api);
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'parent@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text("Sign in a child's device"),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text("Sign in a child's device"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'k7mq 4xpq');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(
      find.text("This code doesn't work (any more). Ask for a new one on the child's device."),
      findsOneWidget,
    );

    await tester.enterText(find.byType(TextField), 'k7mq 4xpr');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('The app on Android, a few minutes ago.'), findsOneWidget);
    await tester.tap(find.text('Sign Sara in'));
    await tester.pumpAndSettle();
    expect(api.called('POST', '/v1/auth/pairing/approve').single.json, {
      'code': 'K7MQ4XPR',
      'childId': 'child-1',
    });
    expect(find.text('Sara is signed in on that device.'), findsOneWidget);
  });

  testWidgets('a parent sets a picture password in the app, after the parental gate', (
    tester,
  ) async {
    var child = childJson();
    final api = FakeApi()
      ..on(
        'POST',
        '/v1/auth/login',
        (_) => FakeResponse({...loginJson(student: false), 'user': meJson(student: false)}),
      )
      ..on('GET', '/v1/children', (_) => FakeResponse([child]))
      ..on('GET', '/v1/billing', (_) => FakeResponse(billingJson()))
      ..on('PUT', '/v1/children/{id}/picture-password', (request) {
        child = {...child, 'hasPicturePassword': request.json['pictures'] != null};
        return FakeResponse(child);
      });
    await pumpApp(tester, api);
    await tester.tap(find.text("I'm a parent"));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'parent@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'a long enough password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sara'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('Choose pictures'),
      200,
      // The child's screen (the parent's home is still under it).
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Choose pictures'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).last, '105');
    await tester.tap(find.widgetWithText(FilledButton, 'Continue'));
    await tester.pumpAndSettle();
    for (final picture in ['tree', 'star', 'tree', 'fish']) {
      await tester.tap(find.byKey(ValueKey('picture-$picture')));
      await tester.pump();
    }
    await tester.tap(find.text('Save picture password'));
    await tester.pumpAndSettle();
    expect(api.called('PUT', '/v1/children/child-1/picture-password').single.json, {
      'pictures': ['tree', 'star', 'tree', 'fish'],
    });
    expect(find.text('Picture password saved. Show Sara the pictures, in order.'), findsOneWidget);
    expect(find.text('Sara has a picture password. Set a new one to change it.'), findsOneWidget);
  });
}
