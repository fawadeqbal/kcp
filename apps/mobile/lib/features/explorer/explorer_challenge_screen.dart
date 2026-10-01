import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../api/api_error.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../student/student_data.dart';
import 'explorer_view.dart';

/// Waits this long after the last change before saving the draft.
const draftDelay = Duration(milliseconds: 800);

/// An Explorer step (blocks) on a phone or tablet: what to do, the block editor
/// and Bit's world. "Check my blocks" runs the checks in the page and sends the
/// results with the program; the server runs them again before it counts.
class ExplorerChallengeScreen extends ConsumerWidget {
  const ExplorerChallengeScreen({super.key, required this.lessonId, required this.challengeId});

  final String lessonId;
  final String challengeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final lesson = ref.watch(lessonProvider(lessonId));
    final index = lesson.value?.challenges.indexWhere((c) => c.id == challengeId) ?? -1;
    return switch (lesson) {
      AsyncData(:final value) when index >= 0 && _isBlocks(value.challenges[index]) =>
        _ExplorerStep(key: ValueKey(challengeId), lesson: value, index: index),
      AsyncData() => Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(t.lessonNotFound, textAlign: TextAlign.center),
          ),
        ),
      ),
      AsyncError(:final error) => Scaffold(
        appBar: AppBar(),
        body: ApiError.from(error).code == 'PREMIUM_REQUIRED'
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(t.lessonPremium, textAlign: TextAlign.center),
                ),
              )
            : ErrorView(error: error, onRetry: () => ref.invalidate(lessonProvider(lessonId))),
      ),
      _ => Scaffold(appBar: AppBar(), body: const LoadingView()),
    };
  }
}

bool _isBlocks(ChallengeDto challenge) =>
    challenge.type == ChallengeDtoTypeEnum.BLOCKS && challenge.stage != null;

/// Which steps of a lesson the app can open (the others need a keyboard).
bool isAppStep(ChallengeDto challenge) => _isBlocks(challenge);

sealed class _Feedback {
  const _Feedback();
}

class _Passed extends _Feedback {
  const _Passed(this.result);

  final SubmissionResultDto result;
}

class _NotYet extends _Feedback {
  const _NotYet({required this.passed, required this.total, required this.hint});

  final int passed;
  final int total;
  final String? hint;
}

class _CheckFailed extends _Feedback {
  const _CheckFailed();
}

class _ExplorerStep extends ConsumerStatefulWidget {
  const _ExplorerStep({super.key, required this.lesson, required this.index});

  final LessonDto lesson;
  final int index;

  @override
  ConsumerState<_ExplorerStep> createState() => _ExplorerStepState();
}

class _ExplorerStepState extends ConsumerState<_ExplorerStep> {
  final _explorer = ExplorerController();
  late final ChallengeDto _challenge = widget.lesson.challenges[widget.index];
  late String _program = _challenge.draft?.blocks ?? _challenge.starter.blocks ?? '[]';
  late Set<String> _passedIds = _challenge.passed ? {for (final c in _checks) c.id} : {};
  Timer? _saveTimer;
  String? _unsaved;
  bool _saveFailed = false;
  bool _checking = false;
  _Feedback? _feedback;

  List<({String id, String? hint})> get _checks => [
    for (final check in _challenge.checks)
      if (check is Map<String, dynamic> && check['id'] is String)
        (id: check['id'] as String, hint: check['hint'] as String?),
  ];

  @override
  void dispose() {
    _saveTimer?.cancel();
    // Whatever wasn't saved yet goes now (the screen is closing).
    if (_unsaved != null) unawaited(_save(_unsaved!));
    super.dispose();
  }

  void _onChange(String program) {
    _program = program;
    _unsaved = program;
    if (_feedback != null || _saveFailed) {
      setState(() {
        _feedback = null;
      });
    }
    _saveTimer?.cancel();
    _saveTimer = Timer(draftDelay, () => unawaited(_save(program)));
  }

  Future<void> _save(String program) async {
    final api = ref.read(apiProvider);
    try {
      await api.getLearningApi().learningSaveDraft(
        id: _challenge.id,
        saveDraftDto: SaveDraftDto(code: CodeFilesDto(blocks: program)),
      );
      if (_unsaved == program) _unsaved = null;
      if (mounted && _saveFailed) setState(() => _saveFailed = false);
    } catch (_) {
      if (mounted) setState(() => _saveFailed = true);
    }
  }

  Future<void> _check() async {
    if (_checking) return;
    setState(() {
      _checking = true;
      _feedback = null;
    });
    final program = _program;
    try {
      final results = await _explorer.check(_challenge.checks);
      final api = ref.read(apiProvider);
      final response = await api.getLearningApi().learningSubmit(
        id: _challenge.id,
        submitDto: SubmitDto(
          code: CodeFilesDto(blocks: program),
          results: results,
        ),
      );
      final result = response.data!;
      if (_unsaved == program) _unsaved = null;
      if (!mounted) return;
      final passedIds = {
        for (final r in result.results)
          if (r.passed) r.id,
      };
      final firstFailed = result.results.where((r) => !r.passed).firstOrNull;
      setState(() {
        _passedIds = passedIds;
        _feedback = result.passed
            ? _Passed(result)
            : _NotYet(
                passed: passedIds.length,
                total: result.results.length,
                hint: firstFailed == null
                    ? null
                    : (_challenge.hints[firstFailed.id] ?? firstFailed.hint),
              );
      });
      if (result.passed) {
        ref.invalidate(progressProvider);
        ref.invalidate(overviewProvider);
      }
    } catch (_) {
      if (mounted) setState(() => _feedback = const _CheckFailed());
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _startAgain() async {
    final t = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.explorerResetTitle),
        content: Text(t.explorerResetBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(t.cancel)),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(t.explorerStartAgain),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final starter = _challenge.starter.blocks ?? '[]';
    await _explorer.setProgram(starter);
    _onChange(starter);
  }

  /// The next step the app can open in this lesson, if any.
  ChallengeDto? get _nextStep {
    for (final challenge in widget.lesson.challenges.skip(widget.index + 1)) {
      if (isAppStep(challenge)) return challenge;
    }
    return null;
  }

  void _leave() {
    // The lesson shows the step as done.
    ref.invalidate(lessonProvider(widget.lesson.id));
    final next = _nextStep;
    if (next != null && _feedback is _Passed) {
      context.pushReplacement('/lesson/${widget.lesson.id}/step/${next.id}');
    } else {
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final language = ref.watch(appLanguageProvider);
    final textDirection = widget.lesson.language == 'en' && language != 'en'
        ? TextDirection.ltr
        : Directionality.of(context);
    final explorer = ExplorerView(
      level: _challenge.stage!,
      program: _program,
      onChange: _onChange,
      controller: _explorer,
    );
    final instructions = _Instructions(
      challenge: _challenge,
      checks: _checks,
      passedIds: _passedIds,
      textDirection: textDirection,
    );
    return Scaffold(
      appBar: AppBar(
        title: Text(t.lessonStep(widget.index + 1)),
        actions: [
          IconButton(
            tooltip: t.explorerStartAgain,
            onPressed: _checking ? null : _startAgain,
            icon: const KcpIcon('undo', size: 22),
          ),
        ],
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 720;
            final bottom = _BottomBar(
              checking: _checking,
              saveFailed: _saveFailed,
              feedback: _feedback,
              nextStep: _nextStep != null,
              onCheck: _check,
              onLeave: _leave,
            );
            if (wide) {
              return Row(
                children: [
                  SizedBox(
                    width: 340,
                    child: Column(
                      children: [
                        Expanded(child: instructions),
                        bottom,
                      ],
                    ),
                  ),
                  Expanded(child: explorer),
                ],
              );
            }
            return Column(
              children: [
                ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: constraints.maxHeight * 0.3),
                  child: instructions,
                ),
                Expanded(child: explorer),
                bottom,
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Instructions extends StatelessWidget {
  const _Instructions({
    required this.challenge,
    required this.checks,
    required this.passedIds,
    required this.textDirection,
  });

  final ChallengeDto challenge;
  final List<({String id, String? hint})> checks;
  final Set<String> passedIds;
  final TextDirection textDirection;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    return Scrollbar(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
        children: [
          Directionality(
            textDirection: textDirection,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(challenge.title, style: theme.textTheme.titleLarge),
                ),
                const SizedBox(height: 6),
                MarkdownBody(
                  data: challenge.instructions,
                  styleSheet: MarkdownStyleSheet.fromTheme(theme),
                  imageBuilder: (uri, title, alt) => Text(alt ?? title ?? ''),
                ),
              ],
            ),
          ),
          if (checks.isNotEmpty) ...[
            const SizedBox(height: 12),
            Kicker(t.explorerChecks),
            const SizedBox(height: 6),
            for (final check in checks)
              Semantics(
                checked: passedIds.contains(check.id),
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      passedIds.contains(check.id)
                          ? KcpIcon('check', size: 18, color: p.sage600)
                          : Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: p.muted, width: 2),
                              ),
                            ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Directionality(
                          textDirection: textDirection,
                          child: Text(challenge.checkLabels[check.id] ?? check.id),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.checking,
    required this.saveFailed,
    required this.feedback,
    required this.nextStep,
    required this.onCheck,
    required this.onLeave,
  });

  final bool checking;
  final bool saveFailed;
  final _Feedback? feedback;
  final bool nextStep;
  final VoidCallback onCheck;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    final feedback = this.feedback;
    return Material(
      color: p.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              liveRegion: true,
              child: switch (feedback) {
                _Passed(:final result) => SectionCard(
                  color: p.sage100,
                  radius: KcpRadius.row,
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      KcpIcon('check', size: 22, color: p.sage800),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          [
                            result.lessonCompleted ? t.explorerLessonComplete : t.explorerAllPassed,
                            if (result.xpAwarded > 0) t.explorerXp(result.xpAwarded.toInt()),
                          ].join(' '),
                          style: TextStyle(color: p.sage800, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
                _NotYet(:final passed, :final total, :final hint) => SectionCard(
                  color: p.brand100,
                  radius: KcpRadius.row,
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    '${t.explorerSomeFailed(passed, total)} ${hint ?? t.explorerNoHint}',
                    style: TextStyle(color: p.brand800),
                  ),
                ),
                _CheckFailed() => SectionCard(
                  color: p.dangerSoft,
                  radius: KcpRadius.row,
                  padding: const EdgeInsets.all(12),
                  child: Text(t.explorerCheckFailed, style: TextStyle(color: p.dangerText)),
                ),
                null =>
                  saveFailed
                      ? Text(t.explorerSaveFailed, style: Theme.of(context).textTheme.bodySmall)
                      : const SizedBox.shrink(),
              },
            ),
            if (feedback != null || saveFailed) const SizedBox(height: 10),
            if (feedback is _Passed)
              FilledButton(
                onPressed: onLeave,
                child: Text(nextStep ? t.explorerNextStep : t.explorerBackToLesson),
              )
            else
              FilledButton.icon(
                onPressed: checking ? null : onCheck,
                icon: const KcpIcon('check', size: 20),
                label: Text(checking ? t.explorerChecking : t.explorerCheck),
              ),
          ],
        ),
      ),
    );
  }
}
