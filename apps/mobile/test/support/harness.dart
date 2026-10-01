import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_app/api/api.dart';
import 'package:kcp_app/app.dart';
import 'package:kcp_app/auth/token_store.dart';
import 'package:kcp_app/config/app_config.dart';
import 'package:kcp_app/config/preferences.dart';
import 'package:kcp_app/widgets/parental_gate.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fake_api.dart';

const testConfig = AppConfig(
  flavor: 'test',
  apiUrl: 'https://api.test',
  webUrl: 'https://app.test',
);

/// Always picks the same numbers: the parental gate asks "fifteen times seven".
class FixedRandom implements Random {
  @override
  int nextInt(int max) => 4;
  @override
  double nextDouble() => 0.5;
  @override
  bool nextBool() => true;
}

/// A container with the fake API, an in-memory token store and settings.
Future<(ProviderContainer, MemoryTokenStore)> makeContainer(
  FakeApi api, {
  String? refreshToken,
  String? language,
  List<Override> overrides = const [],
}) async {
  SharedPreferences.setMockInitialValues({'kcp.installed': true, 'kcp.language': ?language});
  final prefs = await SharedPreferences.getInstance();
  final store = MemoryTokenStore()..token = refreshToken;
  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      httpAdapterProvider.overrideWithValue(api),
      tokenStoreProvider.overrideWithValue(store),
      appConfigProvider.overrideWithValue(testConfig),
      deviceLocalesProvider.overrideWithValue(const [Locale('en')]),
      ...overrides,
    ],
    retry: (_, _) => null,
  );
  return (container, store);
}

/// The whole app on a phone-sized screen, talking to the fake API.
Future<(ProviderContainer, MemoryTokenStore)> pumpApp(
  WidgetTester tester,
  FakeApi api, {
  String? refreshToken,
  String? language,
  List<Override> overrides = const [],
  Size size = const Size(1080, 2340),
}) async {
  parentalGateRandom = FixedRandom();
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final (container, store) = await makeContainer(
    api,
    refreshToken: refreshToken,
    language: language,
    overrides: overrides,
  );
  addTearDown(container.dispose);
  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const KcpApp()));
  await tester.pumpAndSettle();
  return (container, store);
}
