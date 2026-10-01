import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_api/kcp_api.dart';
import 'package:kcp_app/features/explorer/explorer_bridge.dart';
import 'package:kcp_app/features/explorer/explorer_challenge_screen.dart';
import 'package:kcp_app/features/explorer/explorer_view.dart';
import 'package:kcp_app/router/router.dart';

import 'support/fake_api.dart';
import 'support/fixtures.dart';
import 'support/harness.dart';

/// Stands in for the WebView (widget tests have none): records what the app runs
/// in the page and lets the test answer as the page would.
class FakeExplorerPage implements ExplorerPage {
  FakeExplorerPage(this.send);

  /// A message from the page to the app.
  final void Function(String) send;
  final calls = <String>[];

  /// Results for the next checks: id → passed.
  Map<String, bool> results = {};

  @override
  Widget build(BuildContext context) => const SizedBox.expand(key: ValueKey('explorer-page'));

  @override
  Future<void> call(String script) async {
    calls.add(script);
    final check = RegExp(r'^window\.KcpExplorer\.check\("([^"]+)"').firstMatch(script);
    if (check != null) {
      send(
        jsonEncode({
          'type': 'results',
          'requestId': check[1],
          'results': [
            for (final entry in results.entries)
              {'id': entry.key, 'passed': entry.value, 'hint': entry.value ? null : 'Page hint'},
          ],
        }),
      );
    }
  }

  @override
  void dispose() {}
}

const program = '[{"when":"run","do":[{"move":"right"}]}]';

Map<String, dynamic> explorerLesson({bool passed = false}) => {
  'id': 'explorer-m01-l01',
  'trackId': 'explorer',
  'moduleId': 'explorer-m01',
  'moduleTitle': 'Meet Bit',
  'number': 1,
  'lessonCount': 5,
  'title': 'Hello, Bit',
  'summary': 'Your first program',
  'body': 'Bit moves when you snap blocks together.',
  'language': 'en',
  'video': null,
  'xp': 20,
  'isPremium': false,
  'status': 'STARTED',
  'previousLessonId': null,
  'nextLessonId': null,
  'challenges': [
    for (final id in ['c1', 'c2'])
      {
        'id': id,
        'title': id == 'c1' ? 'One step right' : 'Two steps',
        'instructions': 'Help **Bit** reach the flag.',
        'type': 'BLOCKS',
        'xp': 10,
        'files': ['blocks'],
        'starter': {'blocks': '[{"when":"run","do":[]}]'},
        'stage': {
          'mode': 'maze',
          'map': ['S.G'],
          'toolbox': ['when-run', 'move'],
        },
        'repo': null,
        'checks': [
          {'id': 'goal', 'kind': 'stage', 'atGoal': true},
          {'id': 'few', 'kind': 'blocks', 'maxBlocks': 3},
        ],
        'hints': {'goal': 'Bit needs one more step.'},
        'checkLabels': {'goal': 'Bit reaches the flag', 'few': 'Three blocks or fewer'},
        'draft': null,
        'passed': passed,
      },
  ],
  'quizzes': <Object>[],
};

/// The API for a student on an Explorer lesson: the lesson, drafts and results.
FakeApi explorerServer() {
  var lesson = explorerLesson();
  return FakeApi()
    ..on('POST', '/v1/auth/refresh', (_) => FakeResponse(loginJson(access: 'a2', refresh: 'r2')))
    ..on('GET', '/v1/auth/me', (_) => FakeResponse(meJson()))
    ..on('GET', '/v1/progress', (_) => FakeResponse(progressJson()))
    ..on('GET', '/v1/learning/practice', (_) => FakeResponse(practiceJson([])))
    ..on('GET', '/v1/learning/tracks', (_) => FakeResponse(overviewJson()))
    ..on(
      'POST',
      '/v1/learning/lessons/{id}/start',
      (_) => const FakeResponse({'lessonId': 'x', 'status': 'STARTED', 'completedAt': null}),
    )
    ..on('GET', '/v1/learning/lessons/{id}', (_) => FakeResponse(lesson))
    ..on('PUT', '/v1/learning/challenges/{id}/draft', (_) => const FakeResponse.empty())
    ..on('POST', '/v1/learning/challenges/{id}/submissions', (request) {
      final results = (request.json['results'] as List).cast<Map<String, dynamic>>();
      final passed = results.every((r) => r['passed'] == true);
      if (passed) lesson = explorerLesson(passed: true);
      return FakeResponse({
        'passed': passed,
        'results': results,
        'lessonCompleted': false,
        'nextLessonId': null,
        'xpAwarded': passed ? 10 : 0,
        'dailyCapReached': false,
        'badgesEarned': <String>[],
      });
    });
}

void main() {
  group('the bridge to the Explorer page', () {
    test('reads the page’s messages and ignores anything else', () {
      expect(ExplorerMessage.parse('{"type":"ready"}'), isA<ExplorerReady>());
      final change = ExplorerMessage.parse('{"type":"change","program":"[]"}');
      expect((change! as ExplorerChange).program, '[]');
      final results = ExplorerMessage.parse(
        '{"type":"results","requestId":"r1","results":[{"id":"goal","passed":false,"hint":"h"}]}',
      );
      expect((results! as ExplorerResults).results.single.hint, 'h');
      expect(ExplorerMessage.parse('not json'), isNull);
      expect(ExplorerMessage.parse('{"type":"results","requestId":1,"results":[]}'), isNull);
      expect(ExplorerMessage.parse('{"type":"change","program":5}'), isNull);
      expect(ExplorerMessage.parse('[1]'), isNull);
    });

    test('what the app runs in the page is JSON, never code from a program', () {
      const sneaky = '"); alert(1); ("';
      final script = ExplorerCalls.setProgram(sneaky);
      expect(script, 'window.KcpExplorer.setProgram(${jsonEncode(sneaky)});');
      final start = ExplorerCalls.start(
        locale: 'ur',
        level: StageDto(
          mode: StageDtoModeEnum.maze,
          map: ['S.G'],
          toolbox: [StageDtoToolboxEnum.move],
        ),
        program: '[]',
        dark: true,
      );
      final config =
          jsonDecode(start.substring('window.KcpExplorer.start('.length, start.length - 2))
              as Map<String, dynamic>;
      expect(config['locale'], 'ur');
      expect(config['dark'], isTrue);
      expect((config['level'] as Map)['map'], ['S.G']);
    });
  });

  testWidgets('a young student builds a step with blocks on a tablet and checks it', (
    tester,
  ) async {
    FakeExplorerPage? page;
    final api = explorerServer();
    final (container, _) = await pumpApp(
      tester,
      api,
      refreshToken: 'r1',
      // A tablet in landscape: what to do beside the blocks.
      size: const Size(3072, 2304),
      overrides: [
        explorerPageProvider.overrideWithValue(
          ({required background, required onMessage}) => page = FakeExplorerPage(onMessage),
        ),
      ],
    );

    unawaited(container.read(routerProvider).push('/lesson/explorer-m01-l01'));
    await tester.pumpAndSettle();
    expect(find.text('Tap a step to build it with blocks.'), findsOneWidget);
    expect(find.text('Try it on your laptop'), findsNothing);
    await tester.tap(find.text('Step 1'));
    // (The page is loading: a spinner, so no pumpAndSettle.)
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // The page loads, then the app starts it with the level and the starter blocks.
    expect(find.text('Getting the blocks ready…'), findsOneWidget);
    page!.send('{"type":"ready"}');
    await tester.pump();
    final start = page!.calls.single;
    expect(start, startsWith('window.KcpExplorer.start('));
    expect(start, contains(r'"program":"[{\"when\":\"run\",\"do\":[]}]"'));
    expect(start, contains('"locale":"en"'));
    page!.send('{"type":"started"}');
    await tester.pump();
    expect(find.text('Getting the blocks ready…'), findsNothing);
    expect(find.text('One step right'), findsOneWidget);
    expect(find.text('Bit reaches the flag'), findsOneWidget);

    // Changes are saved as a draft, a moment after the last one.
    page!.send(jsonEncode({'type': 'change', 'program': '[]'}));
    page!.send(jsonEncode({'type': 'change', 'program': program}));
    await tester.pump(draftDelay);
    final drafts = api.called('PUT', '/v1/learning/challenges/c1/draft');
    expect(drafts, hasLength(1));
    expect(drafts.single.json, {
      'code': {'blocks': program},
    });

    // Not yet: the hint of the first check that failed.
    page!.results = {'goal': false, 'few': true};
    await tester.tap(find.text('Check my blocks'));
    await tester.pumpAndSettle();
    expect(
      find.text('Almost there! 1 of 2 checks passed. Try this: Bit needs one more step.'),
      findsOneWidget,
    );

    // Every check passes: the program and the page's results go to the API.
    page!.results = {'goal': true, 'few': true};
    await tester.tap(find.text('Check my blocks'));
    await tester.pumpAndSettle();
    final submission = api.called('POST', '/v1/learning/challenges/c1/submissions').last.json;
    expect(submission['code'], {'blocks': program});
    expect(submission['results'], [
      {'id': 'goal', 'passed': true},
      {'id': 'few', 'passed': true},
    ]);
    expect(find.text('Well done! Every check passed. +10 XP'), findsOneWidget);

    // On to the next step.
    await tester.tap(find.text('Next step'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('Two steps'), findsOneWidget);
    expect(find.text('Getting the blocks ready…'), findsOneWidget);
  });

  testWidgets('on a phone, what to do sits above the blocks', (tester) async {
    FakeExplorerPage? page;
    final (container, _) = await pumpApp(
      tester,
      explorerServer(),
      refreshToken: 'r1',
      language: 'ur',
      overrides: [
        explorerPageProvider.overrideWithValue(
          ({required background, required onMessage}) => page = FakeExplorerPage(onMessage),
        ),
      ],
    );
    unawaited(container.read(routerProvider).push('/lesson/explorer-m01-l01/step/c1'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    page!.send('{"type":"ready"}');
    page!.send('{"type":"started"}');
    await tester.pump();
    expect(page!.calls.single, contains('"locale":"ur"'));
    expect(find.text('One step right'), findsOneWidget);
    expect(find.text('میرے بلاکس چیک کریں'), findsOneWidget);
    final pageRect = tester.getRect(find.byKey(const ValueKey('explorer-page')));
    expect(pageRect.top, greaterThan(tester.getRect(find.text('One step right')).bottom));
    expect(pageRect.height, greaterThan(300));
  });

  testWidgets('code steps still wait for the laptop', (tester) async {
    expect(
      isAppStep(
        ChallengeDto.fromJson({
          ...(explorerLesson()['challenges'] as List).first as Map<String, dynamic>,
          'type': 'HTML',
          'stage': null,
        }),
      ),
      isFalse,
    );
  });
}
