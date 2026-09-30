import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_api/kcp_api.dart';
import 'package:kcp_app/features/quiz/quiz_model.dart';
import 'package:kcp_app/features/quiz/quiz_view.dart';
import 'package:kcp_app/l10n/app_localizations.dart';
import 'package:kcp_app/theme/app_theme.dart';

import 'support/fixtures.dart';

Widget _host(Widget child, {String language = 'en'}) => MaterialApp(
  theme: buildTheme(language),
  locale: Locale(language),
  supportedLocales: AppLocalizations.supportedLocales,
  localizationsDelegates: const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  home: Scaffold(
    body: SingleChildScrollView(padding: const EdgeInsets.all(16), child: child),
  ),
);

QuizResultDto _result(Map<String, dynamic> json) => QuizResultDto.fromJson(json);

void main() {
  testWidgets('a bug quiz: tap the line, and after two wrong tries see the right one', (
    tester,
  ) async {
    final quiz = QuizItem.fromPractice(
      PracticeQuizDto.fromJson({
        ...choiceQuiz('bug'),
        'kind': 'BUG',
        'codeLanguage': 'html',
        'lines': [
          {'id': '1', 'text': '<h1>Hi</h1>'},
          {'id': '2', 'text': '<p>Hi<p>'},
        ],
        'options': <Object>[],
      }),
    );
    final sent = <QuizAnswer>[];
    var tries = 0;
    await tester.pumpWidget(
      _host(
        QuizView(
          quiz: quiz,
          onSubmit: (_, answer) async {
            sent.add(answer);
            tries++;
            return _result(
              resultJson(
                correct: false,
                explanation: tries >= 2 ? 'Close the p tag.' : null,
                reveal: tries >= 2 ? {'order': null, 'line': 2, 'option': null} : null,
              ),
            );
          },
        ),
      ),
    );
    // Nothing chosen yet: the check button waits.
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);

    await tester.tap(find.text('<h1>Hi</h1>'));
    await tester.pump();
    await tester.tap(find.text('Check my answer'));
    await tester.pumpAndSettle();
    expect(sent.single.line, 1);
    expect(find.text('Not quite. Have another go.'), findsOneWidget);

    await tester.tap(find.text('Check my answer'));
    await tester.pumpAndSettle();
    expect(find.text('Here is the right answer:'), findsOneWidget);
    expect(find.text('Close the p tag.'), findsOneWidget);
    // The right line is now the chosen one.
    final choices = tester.widgetList<QuizChoiceTile>(find.byType(QuizChoiceTile)).toList();
    expect(choices.where((choice) => choice.selected).single.value, '2');
  });

  testWidgets('an output quiz keeps code options on several lines, left to right', (tester) async {
    final quiz = QuizItem.fromPractice(
      PracticeQuizDto.fromJson({
        ...choiceQuiz('out'),
        'kind': 'OUTPUT',
        'codeLanguage': 'python',
        'lines': [
          {'id': '1', 'text': 'print("Hi")'},
          {'id': '2', 'text': 'print(2)'},
        ],
        'options': [
          {'id': 'a', 'text': null, 'code': 'Hi\n2'},
          {'id': 'b', 'text': null, 'code': 'Hi 2'},
        ],
      }),
    );
    await tester.pumpWidget(
      _host(
        QuizView(quiz: quiz, onSubmit: (_, _) async => _result(resultJson(correct: true, xp: 5))),
        language: 'ar',
      ),
    );
    expect(find.text('Hi\n2'), findsOneWidget);
    final direction = tester.widget<Directionality>(
      find.ancestor(of: find.text('Hi\n2'), matching: find.byType(Directionality)).first,
    );
    expect(direction.textDirection, TextDirection.ltr);

    await tester.tap(find.text('Hi\n2'));
    await tester.pump();
    await tester.tap(find.text('تحقّق من إجابتي'));
    await tester.pumpAndSettle();
    expect(find.textContaining('إجابة صحيحة'), findsOneWidget);
    // Answered: no more checking.
    expect(find.text('تحقّق من إجابتي'), findsNothing);
  });

  testWidgets('no connection: the answer stays, with a message', (tester) async {
    final quiz = QuizItem.fromPractice(PracticeQuizDto.fromJson(choiceQuiz('c')));
    await tester.pumpWidget(
      _host(QuizView(quiz: quiz, onSubmit: (_, _) async => throw const SocketLikeError())),
    );
    await tester.tap(find.text('Right'));
    await tester.pump();
    await tester.tap(find.text('Check my answer'));
    await tester.pumpAndSettle();
    expect(find.text('Something went wrong. Please try again.'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNotNull);
  });
}

class SocketLikeError implements Exception {
  const SocketLikeError();
}
