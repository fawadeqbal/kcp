import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:kcp_api/kcp_api.dart';

import '../api/api_error.dart';

/// Our own crash reporting (no crash-reporting SDK: store rules for children's
/// apps). A report holds the app and system versions and what went wrong, never
/// the account, the phone or what the child typed; the server scrubs it again.
class CrashReporter {
  CrashReporter({
    required this.api,
    required this.appVersion,
    this.maxPerRun = 5,
    String? platform,
    String? osVersion,
  }) : platform = platform ?? (Platform.isIOS ? 'ios' : 'android'),
       osVersion = osVersion ?? Platform.operatingSystemVersion;

  final KcpApi api;
  final String appVersion;
  final String platform;
  final String osVersion;

  /// At most this many reports per app run (a crash loop sends a few, not thousands).
  final int maxPerRun;

  int _sent = 0;
  final Set<String> _seen = {};

  /// Network trouble is not a crash: the screens show it.
  static bool isNetworkError(Object error) =>
      error is DioException ||
      error is ApiError ||
      error is SocketException ||
      error is TimeoutException;

  Future<void> report(Object error, StackTrace? stack, {bool fatal = false}) async {
    if (isNetworkError(error) || _sent >= maxPerRun) return;
    final message = _limit(error.toString().trim(), 1000);
    final trace = _limit((stack ?? StackTrace.empty).toString(), 16000);
    final key = '$message\n${trace.split('\n').first}';
    if (!_seen.add(key)) return;
    _sent++;
    try {
      await api.getAppApi().appCrashesReport(
        reportCrashDto: ReportCrashDto(
          appVersion: _limit(appVersion, 32),
          platform: platform == 'ios'
              ? ReportCrashDtoPlatformEnum.ios
              : ReportCrashDtoPlatformEnum.android,
          osVersion: _limit(osVersion, 64),
          fatal: fatal,
          message: message.isEmpty ? 'Unknown error' : message,
          stack: trace,
        ),
      );
    } catch (_) {
      // Reporting must never cause another crash.
    }
  }

  static String _limit(String text, int max) => text.length <= max ? text : text.substring(0, max);

  /// Catches Flutter's errors and uncaught async errors (release builds only).
  void install() {
    if (kDebugMode) return;
    final previous = FlutterError.onError;
    FlutterError.onError = (details) {
      previous?.call(details);
      // A broken screen counts as fatal; "silent" errors (e.g. an image) don't.
      unawaited(report(details.exception, details.stack, fatal: !details.silent));
    };
    PlatformDispatcher.instance.onError = (error, stack) {
      unawaited(report(error, stack));
      return true;
    };
  }
}
