import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import 'quiz_model.dart';

/// Sends an answer to the server and gets the grade back.
typedef SubmitAnswer = Future<QuizResultDto> Function(QuizItem quiz, QuizAnswer answer);

/// One quiz: the question, a way to answer that works with a thumb (and with a
/// screen reader), the grade from the server, and the explanation.
class QuizView extends StatefulWidget {
  const QuizView({
    super.key,
    required this.quiz,
    required this.onSubmit,
    this.onGraded,
    this.onNext,
    this.nextLabel,
    this.kicker,
    this.pinnedFooter = false,
    this.padding = EdgeInsets.zero,
  });

  final QuizItem quiz;
  final SubmitAnswer onSubmit;

  /// After each grade (to refresh the XP bar, or move today's practice on).
  final ValueChanged<QuizResultDto>? onGraded;

  /// Shown as a button once the quiz is answered correctly (e.g. "Next question").
  final VoidCallback? onNext;
  final String? nextLabel;

  /// The small line above the question ("Check yourself").
  final String? kicker;

  /// Fill the space given: the question scrolls, and the check button and the grade
  /// stay at the bottom, in a sheet (today's practice). Otherwise everything flows.
  final bool pinnedFooter;

  /// Around the question (not the pinned sheet).
  final EdgeInsetsGeometry padding;

  @override
  State<QuizView> createState() => _QuizViewState();
}

class _QuizViewState extends State<QuizView> {
  late List<String> _order = [for (final line in widget.quiz.lines) line.id];
  String? _choice;
  QuizResultDto? _result;
  Object? _error;
  bool _busy = false;

  QuizItem get quiz => widget.quiz;
  bool get _done => _result?.correct == true;

  @override
  void didUpdateWidget(QuizView old) {
    super.didUpdateWidget(old);
    if (old.quiz.id != widget.quiz.id) {
      _order = [for (final line in widget.quiz.lines) line.id];
      _choice = null;
      _result = null;
      _error = null;
    }
  }

  QuizAnswer? get _answer => switch (quiz.kind) {
    QuizKind.order => QuizAnswer.order(_order),
    QuizKind.bug => _choice == null ? null : QuizAnswer.line(int.parse(_choice!)),
    _ => _choice == null ? null : QuizAnswer.option(_choice!),
  };

  Future<void> _check() async {
    final answer = _answer;
    if (answer == null || _busy || _done) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await widget.onSubmit(quiz, answer);
      if (!mounted) return;
      setState(() {
        _result = result;
        // Show the right answer in place, so the student can learn from it.
        final reveal = result.reveal;
        if (reveal != null) {
          if (reveal.order != null) _order = List.of(reveal.order!);
          if (reveal.line != null) _choice = reveal.line!.toInt().toString();
          if (reveal.option != null) _choice = reveal.option;
        }
      });
      widget.onGraded?.call(result);
      final t = AppLocalizations.of(context);
      unawaited(
        SemanticsService.sendAnnouncement(
          View.of(context),
          result.correct ? t.quizCorrect : (result.reveal != null ? t.quizRevealed : t.quizWrong),
          Directionality.of(context),
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _choose(String? value) {
    if (value == null || _done || _busy) return;
    setState(() {
      _choice = value;
      _result = null;
    });
  }

  void _move(int index, int by) {
    final target = index + by;
    if (target < 0 || target >= _order.length) return;
    setState(() {
      final moved = _order.removeAt(index);
      _order.insert(target, moved);
      _result = null;
    });
    unawaited(
      SemanticsService.sendAnnouncement(
        View.of(context),
        AppLocalizations.of(context).quizMoved(target + 1),
        Directionality.of(context),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final help = switch (quiz.kind) {
      QuizKind.order => t.quizOrderHelp,
      QuizKind.bug => t.quizBugHelp,
      QuizKind.output => t.quizOutputHelp,
      QuizKind.choice => t.quizChoiceHelp,
    };
    final question = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.kicker != null) ...[Kicker(widget.kicker!), const SizedBox(height: 8)],
        Semantics(header: true, child: Text(quiz.prompt, style: theme.textTheme.headlineSmall)),
        const SizedBox(height: 6),
        Text(help, style: theme.textTheme.bodySmall),
        const SizedBox(height: 16),
        ..._answerArea(t),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              errorText(t, _error!),
              style: theme.textTheme.bodyMedium?.copyWith(color: p.danger),
            ),
          ),
      ],
    );
    final footer = _Footer(
      result: _result,
      pinned: widget.pinnedFooter,
      done: _done,
      checkLabel: _busy ? t.quizChecking : t.quizCheck,
      onCheck: _answer == null || _busy ? null : _check,
      nextLabel: widget.nextLabel ?? t.quizNext,
      onNext: widget.onNext,
    );
    if (!widget.pinnedFooter) {
      return Padding(
        padding: widget.padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [question, const SizedBox(height: 16), footer],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: SingleChildScrollView(padding: widget.padding, child: question),
        ),
        footer,
      ],
    );
  }

  List<Widget> _answerArea(AppLocalizations t) {
    final correct = _result?.correct == true;
    switch (quiz.kind) {
      case QuizKind.order:
        final text = {for (final line in quiz.lines) line.id: line.text};
        return [
          for (final (index, id) in _order.indexed)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _OrderRow(
                position: index + 1,
                code: text[id] ?? '',
                enabled: !_done && !_busy,
                correct: correct,
                onUp: index == 0 ? null : () => _move(index, -1),
                onDown: index == _order.length - 1 ? null : () => _move(index, 1),
              ),
            ),
        ];
      case QuizKind.bug:
        return [
          for (final line in quiz.lines)
            QuizChoiceTile(
              value: line.id,
              selected: _choice == line.id,
              correct: correct && _choice == line.id,
              enabled: !_done && !_busy,
              semanticsLabel: t.quizLine(int.parse(line.id)),
              leading: Text(line.id, style: TextStyle(color: context.kcp.muted)),
              onTap: () => _choose(line.id),
              child: CodeText(line.text),
            ),
        ];
      case QuizKind.output:
      case QuizKind.choice:
        return [
          if (quiz.lines.isNotEmpty) ...[
            CodeBlock([for (final line in quiz.lines) line.text]),
            const SizedBox(height: 12),
          ],
          for (final option in quiz.options)
            QuizChoiceTile(
              value: option.id,
              selected: _choice == option.id,
              correct: correct && _choice == option.id,
              enabled: !_done && !_busy,
              onTap: () => _choose(option.id),
              child: option.code != null
                  ? CodeText(option.code!)
                  : Text(option.text ?? '', style: Theme.of(context).textTheme.bodyLarge),
            ),
        ];
    }
  }
}

/// The check button, and once graded the verdict with the explanation: a sheet at
/// the bottom of the screen ([pinned]) or a panel under the question.
class _Footer extends StatelessWidget {
  const _Footer({
    required this.result,
    required this.pinned,
    required this.done,
    required this.checkLabel,
    required this.onCheck,
    required this.nextLabel,
    required this.onNext,
  });

  final QuizResultDto? result;
  final bool pinned;
  final bool done;
  final String checkLabel;
  final VoidCallback? onCheck;
  final String nextLabel;
  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final result = this.result;
    final (background, foreground, disc, icon, title) = result == null
        ? (p.canvas, p.ink, p.ink, 'check', '')
        : result.correct
        ? (
            p.sage100,
            p.sage900,
            p.sage600,
            'check',
            result.xpAwarded > 0 ? t.quizCorrectXp(result.xpAwarded.toInt()) : t.quizCorrect,
          )
        : result.reveal != null
        ? (p.brand100, p.brand900, p.brand, 'lightbulb', t.quizRevealed)
        : (p.warnSoft, p.warnText, p.warnText, 'refresh', t.quizWrong);

    final button = done
        ? (onNext == null
              ? null
              : FilledButton(
                  onPressed: onNext,
                  style: FilledButton.styleFrom(
                    backgroundColor: p.sage700,
                    foregroundColor: p.sage100,
                  ),
                  child: Text(nextLabel),
                ))
        : FilledButton(onPressed: onCheck, child: Text(checkLabel));

    final verdict = result == null
        ? null
        : Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: disc, shape: BoxShape.circle),
                    child: KcpIcon(icon, size: 18, color: background),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      title,
                      style: theme.textTheme.titleLarge?.copyWith(color: foreground),
                    ),
                  ),
                ],
              ),
              if (result.explanation != null && result.explanation!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(result.explanation!, style: TextStyle(color: foreground)),
              ],
              if (result.dailyCapReached) ...[
                const SizedBox(height: 4),
                Text(
                  t.dailyCapReached,
                  style: theme.textTheme.bodySmall?.copyWith(color: foreground),
                ),
              ],
            ],
          );

    if (!pinned) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (verdict != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(KcpRadius.row),
              ),
              child: verdict,
            ),
            const SizedBox(height: 12),
          ],
          ?button,
        ],
      );
    }
    return Semantics(
      container: true,
      liveRegion: result != null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.fromLTRB(20, verdict == null ? 12 : 20, 20, 16),
        decoration: BoxDecoration(
          color: background,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(KcpRadius.panel)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (verdict != null) ...[verdict, const SizedBox(height: 14)],
              ?button,
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({
    required this.position,
    required this.code,
    required this.enabled,
    required this.correct,
    required this.onUp,
    required this.onDown,
  });

  final int position;
  final String code;
  final bool enabled;
  final bool correct;
  final VoidCallback? onUp;
  final VoidCallback? onDown;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    return Container(
      decoration: BoxDecoration(
        color: correct ? p.sage100 : p.surface,
        borderRadius: BorderRadius.circular(KcpRadius.well),
      ),
      padding: const EdgeInsetsDirectional.only(start: 16),
      child: Row(
        children: [
          ExcludeSemantics(
            child: Text('$position', style: TextStyle(color: p.muted)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Semantics(
              label: t.quizLine(position),
              child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: CodeText(code)),
            ),
          ),
          IconButton(
            onPressed: enabled ? onUp : null,
            tooltip: t.quizMoveUp(position),
            icon: const KcpIcon('chevU', size: 20),
          ),
          IconButton(
            onPressed: enabled ? onDown : null,
            tooltip: t.quizMoveDown(position),
            icon: const KcpIcon('chevD', size: 20),
          ),
        ],
      ),
    );
  }
}

/// One answer to pick: a rounded row. The chosen one is outlined; a right answer
/// turns sage with a tick.
class QuizChoiceTile extends StatelessWidget {
  const QuizChoiceTile({
    super.key,
    required this.value,
    required this.selected,
    required this.enabled,
    required this.onTap,
    required this.child,
    this.correct = false,
    this.leading,
    this.semanticsLabel,
  });

  final String value;
  final bool selected;
  final bool correct;
  final bool enabled;
  final VoidCallback onTap;
  final Widget child;
  final Widget? leading;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.kcp;
    final (fill, outline) = correct
        ? (p.sage100, p.sage600)
        : selected
        ? (p.brand100, p.brand)
        : (p.surface, Colors.transparent);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Semantics(
        inMutuallyExclusiveGroup: true,
        checked: selected,
        selected: selected,
        enabled: enabled,
        button: true,
        label: semanticsLabel,
        child: Material(
          color: fill,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(KcpRadius.well),
            side: BorderSide(color: outline, width: 2),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: enabled ? onTap : null,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 52),
              child: Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 12, 12),
                child: Row(
                  children: [
                    if (leading != null) ...[leading!, const SizedBox(width: 12)],
                    Expanded(
                      child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: child),
                    ),
                    if (correct)
                      Container(
                        width: 26,
                        height: 26,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: p.sage600, shape: BoxShape.circle),
                        child: KcpIcon('check', size: 15, color: p.sage100),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
