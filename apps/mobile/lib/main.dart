import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api/api.dart';
import 'app.dart';
import 'config/preferences.dart';
import 'crash/crash_reporter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final container = ProviderContainer(
    overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
    // Screens offer "try again" themselves; no silent retries.
    retry: (_, _) => null,
  );
  final info = await PackageInfo.fromPlatform();
  CrashReporter(
    api: container.read(publicApiProvider),
    appVersion: '${info.version}+${info.buildNumber}',
  ).install();
  runApp(UncontrolledProviderScope(container: container, child: const KcpApp()));
}
