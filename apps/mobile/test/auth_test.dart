import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_app/api/api.dart';
import 'package:kcp_app/auth/auth_controller.dart';
import 'package:kcp_app/config/preferences.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

Future<AuthState> settled(dynamic container) async {
  for (var i = 0; i < 50; i++) {
    final state = container.read(authControllerProvider) as AuthState;
    if (state is! AuthRestoring) return state;
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
  throw StateError('Still restoring');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('picks up a saved session and keeps the rotated refresh token', () async {
    final api = FakeApi()
      ..on('POST', '/v1/auth/refresh', (request) {
        expect(request.json, {'refreshToken': 'r1', 'tokenDelivery': 'body', 'app': 'mobile'});
        return FakeResponse(loginJson(access: 'a1', refresh: 'r2'));
      })
      ..on('GET', '/v1/auth/me', (request) {
        expect(request.authorization, 'Bearer a1');
        return FakeResponse(meJson());
      });
    final (container, store) = await makeContainer(api, refreshToken: 'r1');
    addTearDown(container.dispose);
    expect(await settled(container), isA<SignedIn>());
    expect(store.token, 'r2');
  });

  test('without a saved session, and with one that has ended', () async {
    final api = FakeApi()
      ..on('POST', '/v1/auth/refresh', (_) => FakeResponse.error(401, 'INVALID_REFRESH_TOKEN'));
    final (empty, _) = await makeContainer(api);
    addTearDown(empty.dispose);
    expect(await settled(empty), isA<SignedOut>());

    final (ended, store) = await makeContainer(api, refreshToken: 'old');
    addTearDown(ended.dispose);
    final state = await settled(ended);
    expect(state, isA<SignedOut>());
    expect((state as SignedOut).expired, isTrue);
    expect(store.token, isNull);
  });

  test('a fresh install starts signed out, even if the Keychain kept a token', () async {
    final api = FakeApi();
    final (container, store) = await makeContainer(api, refreshToken: 'left-over');
    addTearDown(container.dispose);
    final prefs = container.read(sharedPreferencesProvider);
    await prefs.remove('kcp.installed');
    await container.read(authControllerProvider.notifier).restore();
    expect(container.read(authControllerProvider), isA<SignedOut>());
    expect(store.token, isNull);
    expect(api.requests, isEmpty);
  });

  test('offline at start: keeps the session and offers to try again', () async {
    final api = FakeApi()..offline = true;
    final (container, store) = await makeContainer(api, refreshToken: 'r1');
    addTearDown(container.dispose);
    expect(await settled(container), isA<AuthOffline>());
    expect(store.token, 'r1');
  });

  test('an expired access token is refreshed once, and the request repeated', () async {
    var refreshes = 0;
    final api = FakeApi()
      ..on('POST', '/v1/auth/refresh', (_) {
        refreshes++;
        return FakeResponse(loginJson(access: 'a$refreshes', refresh: 'r${refreshes + 1}'));
      })
      ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
      ..on('GET', '/v1/progress', (request) {
        // The first access token has expired by now.
        if (request.authorization == 'Bearer a1') return FakeResponse.error(401, 'Unauthorized');
        return FakeResponse(progressJson(xp: 42));
      });
    final (container, store) = await makeContainer(api, refreshToken: 'r1');
    addTearDown(container.dispose);
    await settled(container);
    final client = container.read(apiProvider);
    final results = await Future.wait([
      client.getProgressApi().progressSummary(),
      client.getProgressApi().progressSummary(),
    ]);
    expect(results.map((r) => r.data!.xpTotal), [42, 42]);
    expect(refreshes, 2);
    expect(store.token, 'r3');
  });

  test('when the session can’t be renewed, the app signs out', () async {
    var refreshOk = true;
    final api = FakeApi()
      ..on(
        'POST',
        '/v1/auth/refresh',
        (_) => refreshOk
            ? FakeResponse(loginJson(access: 'a1', refresh: 'r2'))
            : FakeResponse.error(401, 'INVALID_REFRESH_TOKEN'),
      )
      ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
      ..on('GET', '/v1/progress', (_) => FakeResponse.error(401, 'Unauthorized'));
    final (container, store) = await makeContainer(api, refreshToken: 'r1');
    addTearDown(container.dispose);
    await settled(container);
    refreshOk = false;
    await expectLater(
      container.read(apiProvider).getProgressApi().progressSummary(),
      throwsA(anything),
    );
    final state = container.read(authControllerProvider);
    expect(state, isA<SignedOut>());
    expect((state as SignedOut).expired, isTrue);
    expect(store.token, isNull);
  });

  test('logging out ends the session on the server and forgets it here', () async {
    final api = FakeApi()
      ..on('POST', '/v1/auth/refresh', (_) => FakeResponse(loginJson(access: 'a1', refresh: 'r2')))
      ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
      ..on('POST', '/v1/auth/logout', (_) => const FakeResponse.empty());
    final (container, store) = await makeContainer(api, refreshToken: 'r1');
    addTearDown(container.dispose);
    await settled(container);
    await container.read(authControllerProvider.notifier).logout();
    expect(api.called('POST', '/v1/auth/logout').single.json['refreshToken'], 'r2');
    expect(container.read(authControllerProvider), isA<SignedOut>());
    expect(store.token, isNull);
    expect(container.read(sessionTokensProvider).accessToken, isNull);
  });
}
