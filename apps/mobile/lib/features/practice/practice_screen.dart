import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../quiz/quiz_model.dart';
import '../quiz/quiz_view.dart';
import '../student/student_data.dart';

/// Today's practice: one quiz at a time. Finishing it earns the day's practice XP,
/// enough for the daily goal, so the streak can be kept from the phone.
class PracticeScreen extends ConsumerWidget {
  const PracticeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final practice = ref.watch(practiceProvider);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: switch (practice) {
          AsyncData(:final value) => _PracticeFlow(practice: value),
          AsyncError(:final error) => Column(
            children: [
              _TopBar(title: t.practiceTitle),
              Expanded(
                child: ErrorView(error: error, onRetry: () => ref.invalidate(practiceProvider)),
              ),
            ],
          ),
          _ => Column(
            children: [
              _TopBar(title: t.practiceTitle),
              const Expanded(child: LoadingView()),
            ],
          ),
        },
      ),
    );
  }
}

class _PracticeFlow extends ConsumerStatefulWidget {
  const _PracticeFlow({required this.practice});

  final PracticeDto practice;

  @override
  ConsumerState<_PracticeFlow> createState() => _PracticeFlowState();
}

class _PracticeFlowState extends ConsumerState<_PracticeFlow> {
  late final List<QuizItem> _quizzes = [
    for (final quiz in widget.practice.quizzes) QuizItem.fromPractice(quiz),
  ];
  late final Set<String> _answered = widget.practice.answeredQuizIds.toSet();
  late int _index = _firstOpen();
  int _xpEarned = 0;

  /// The practice finished with an answer given here (not on an earlier visit).
  bool _finishedNow = false;

  /// Showing the summary instead of a quiz.
  late bool _showSummary = widget.practice.done;

  int _firstOpen() {
    final open = _quizzes.indexWhere((quiz) => !_answered.contains(quiz.id));
    return open == -1 ? 0 : open;
  }

  void _graded(QuizItem quiz, QuizResultDto result) {
    setState(() {
      _xpEarned += result.xpAwarded.toInt();
      if (result.correct) _answered.add(quiz.id);
      if (result.practice?.done == true && !widget.practice.done) _finishedNow = true;
    });
    // XP and the streak changed: the home screen shows the new numbers.
    ref.invalidate(progressProvider);
  }

  void _next() {
    setState(() {
      final open = _quizzes.indexWhere((quiz) => !_answered.contains(quiz.id));
      if (open == -1) {
        _showSummary = true;
      } else {
        _index = open;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    if (_quizzes.isEmpty) {
      return Column(
        children: [
          _TopBar(title: t.practiceTitle),
          Expanded(
            child: Center(
              child: Padding(padding: const EdgeInsets.all(24), child: Text(t.practiceNone)),
            ),
          ),
        ],
      );
    }
    if (_showSummary) {
      return Column(
        children: [
          _TopBar(title: t.practiceTitle),
          Expanded(
            child: _Finished(xpEarned: _xpEarned, justNow: _finishedNow),
          ),
        ],
      );
    }
    final quiz = _quizzes[_index];
    // Other quizzes still to answer after this one.
    final othersLeft = _quizzes.any((q) => q.id != quiz.id && !_answered.contains(q.id));
    final number = _answered.where((id) => id != quiz.id).length + 1;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _TopBar(
          progress: _answered.length / _quizzes.length,
          counter: t.quizProgress(number, _quizzes.length),
          counterLabel: t.practiceQuestionOf(number, _quizzes.length),
        ),
        if (quiz.lessonTitle != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
            child: Text(
              t.practiceFromLesson(quiz.lessonTitle!),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        Expanded(
          child: QuizView(
            key: ValueKey(quiz.id),
            quiz: quiz,
            kicker: t.checkYourself,
            pinnedFooter: true,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            onSubmit: (quiz, answer) => answerQuiz(ref, quiz, answer),
            onGraded: (result) => _graded(quiz, result),
            onNext: _next,
            nextLabel: othersLeft ? t.quizNext : t.practiceFinish,
          ),
        ),
      ],
    );
  }
}

/// Close, how far through the practice, and "2 / 4".
class _TopBar extends StatelessWidget {
  const _TopBar({this.title, this.progress, this.counter, this.counterLabel});

  final String? title;
  final double? progress;
  final String? counter;
  final String? counterLabel;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 20, 0),
      child: Row(
        children: [
          IconButton(
            tooltip: t.closePractice,
            style: IconButton.styleFrom(backgroundColor: p.surface),
            icon: const KcpIcon('x', size: 20),
            onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
          ),
          const SizedBox(width: 12),
          if (title != null)
            Expanded(child: Text(title!, style: Theme.of(context).textTheme.titleLarge))
          else ...[
            Expanded(
              child: Semantics(
                label: counterLabel,
                child: ExcludeSemantics(child: KcpMeter(fraction: progress ?? 0)),
              ),
            ),
            const SizedBox(width: 12),
            ExcludeSemantics(
              // "2 / 4" reads the same way in every language.
              child: Text(
                counter ?? '',
                textDirection: TextDirection.ltr,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(color: p.muted),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Finished extends ConsumerWidget {
  const _Finished({required this.xpEarned, required this.justNow});

  final int xpEarned;
  final bool justNow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final progress = ref.watch(progressProvider);
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconDisc('trophy', size: 96, background: context.kcp.brand100),
            const SizedBox(height: 18),
            Semantics(
              liveRegion: true,
              child: Text(
                justNow ? t.practiceFinishedTitle : t.practiceDoneToday,
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineMedium,
              ),
            ),
            if (xpEarned > 0) ...[
              const SizedBox(height: 8),
              Text(t.practiceXpEarned(xpEarned), style: theme.textTheme.titleMedium),
            ],
            if (progress case AsyncData(:final value)) ...[
              const SizedBox(height: 8),
              Text(
                value.streak.doneToday
                    ? t.practiceStreakKept(value.streak.current.toInt())
                    : t.goalToday(value.today.xp.toInt(), value.today.goalXp.toInt()),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
              child: Text(t.backHome),
            ),
          ],
        ),
      ),
    );
  }
}
