import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_api/kcp_api.dart';
import 'package:kcp_app/crash/crash_reporter.dart';

import 'support/fake_api.dart';

void main() {
  test('reports a crash with versions only, a few times per run at most', () async {
    final api = FakeApi()..on('POST', '/v1/app/crashes', (_) => const FakeResponse.empty());
    final dio = Dio(BaseOptions(baseUrl: 'https://api.test'))..httpClientAdapter = api;
    final reporter = CrashReporter(
      api: KcpApi(dio: dio, interceptors: const []),
      appVersion: '1.0.0+1',
      platform: 'android',
      osVersion: 'Android 15',
      maxPerRun: 2,
    );
    await reporter.report(StateError('boom'), StackTrace.current, fatal: true);
    // The same crash again, and a network problem: not reported.
    await reporter.report(StateError('boom'), StackTrace.current, fatal: true);
    await reporter.report(DioException(requestOptions: RequestOptions()), null);
    await reporter.report(ArgumentError('two'), null);
    await reporter.report(ArgumentError('three'), null);

    final sent = api.called('POST', '/v1/app/crashes');
    expect(sent, hasLength(2));
    expect(sent.first.json, containsPair('appVersion', '1.0.0+1'));
    expect(sent.first.json, containsPair('platform', 'android'));
    expect(sent.first.json, containsPair('fatal', true));
    expect(sent.first.json['message'], 'Bad state: boom');
    expect(sent.first.json.keys, isNot(contains('userId')));
  });
}
