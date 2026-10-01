import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';
import 'package:markdown/markdown.dart' as md;

import '../../api/api_error.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../explorer/explorer_challenge_screen.dart';
import '../quiz/quiz_model.dart';
import '../quiz/quiz_view.dart';
import '../student/home_screen.dart';
import '../student/student_data.dart';

/// A lesson on the phone: the explainer and the quick questions. Explorer steps
/// (blocks) open here; code challenges need a keyboard, so they wait on the laptop.
class LessonScreen extends ConsumerWidget {
  const LessonScreen({super.key, required this.lessonId});

  final String lessonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final lesson = ref.watch(lessonProvider(lessonId));
    return Scaffold(
      appBar: AppBar(title: Text(t.lessonTitle)),
      body: switch (lesson) {
        AsyncData(:final value) => _LessonBody(lesson: value),
        AsyncError(:final error) when ApiError.from(error).code == 'PREMIUM_REQUIRED' => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(t.lessonPremium, textAlign: TextAlign.center),
          ),
        ),
        AsyncError(:final error) when ApiError.from(error).status == 404 => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(t.lessonNotFound, textAlign: TextAlign.center),
          ),
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(lessonProvider(lessonId)),
        ),
        _ => const LoadingView(),
      },
    );
  }
}

class _LessonBody extends ConsumerWidget {
  const _LessonBody({required this.lesson});

  final LessonDto lesson;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final language = ref.watch(appLanguageProvider);
    // Texts that fell back to English read left-to-right inside an Arabic or Urdu app.
    final textDirection = lesson.language == 'en' && language != 'en'
        ? TextDirection.ltr
        : Directionality.of(context);
    final p = context.kcp;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        Kicker(t.lessonOf(lesson.number.toInt(), lesson.lessonCount.toInt())),
        const SizedBox(height: 4),
        Directionality(
          textDirection: textDirection,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(lesson.moduleTitle, style: theme.textTheme.bodySmall),
              const SizedBox(height: 4),
              Semantics(
                header: true,
                child: Text(lesson.title, style: theme.textTheme.headlineMedium),
              ),
              const SizedBox(height: 8),
              Text(lesson.summary, style: theme.textTheme.bodyLarge?.copyWith(color: p.muted)),
            ],
          ),
        ),
        if (lesson.status == LessonDtoStatusEnum.COMPLETED) ...[
          const SizedBox(height: 8),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: KcpPill(
              icon: 'check',
              label: t.lessonDone,
              background: p.sage100,
              color: p.sage800,
            ),
          ),
        ],
        const SizedBox(height: 16),
        if (lesson.video != null) ...[
          SectionCard(
            color: p.raised,
            child: Row(
              children: [
                const IconDisc('video', size: 40),
                const SizedBox(width: 12),
                Expanded(child: Text(t.lessonVideoOnLaptop)),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        SectionCard(
          child: Directionality(
            textDirection: textDirection,
            child: MarkdownBody(
              data: lesson.body,
              styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(
                code: TextStyle(
                  fontFamily: 'monospace',
                  backgroundColor: p.brand100,
                  color: p.brand800,
                ),
                codeblockDecoration: BoxDecoration(
                  color: p.codeBg,
                  borderRadius: BorderRadius.circular(KcpRadius.well),
                ),
                codeblockPadding: const EdgeInsets.all(12),
              ),
              builders: {'pre': _CodeBlockBuilder()},
              // Nothing is loaded from other sites: an image shows its description.
              imageBuilder: (uri, title, alt) => Text(alt ?? title ?? ''),
            ),
          ),
        ),
        if (lesson.quizzes.isNotEmpty) ...[
          const SizedBox(height: 24),
          Semantics(
            header: true,
            child: Text(t.checkYourself, style: theme.textTheme.headlineSmall),
          ),
          const SizedBox(height: 4),
          Text(t.checkYourselfIntro, style: theme.textTheme.bodySmall),
          const SizedBox(height: 12),
          for (final (index, quiz) in lesson.quizzes.indexed) ...[
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Kicker(t.questionOf(index + 1, lesson.quizzes.length)),
                      const Spacer(),
                      if (quiz.solved) KcpIcon('check', size: 20, color: p.sage600),
                    ],
                  ),
                  const SizedBox(height: 8),
                  QuizView(
                    quiz: QuizItem.fromLesson(quiz),
                    onSubmit: (item, answer) => answerQuiz(ref, item, answer),
                    onGraded: (_) => ref.invalidate(progressProvider),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
        ],
        if (lesson.challenges.isNotEmpty) ...[
          const SizedBox(height: 12),
          Semantics(
            header: true,
            child: Text(
              lesson.challenges.every(isAppStep) ? t.explorerSteps : t.lessonChallenges,
              style: theme.textTheme.headlineSmall,
            ),
          ),
          const SizedBox(height: 8),
          if (lesson.challenges.any(isAppStep)) ...[
            Text(t.explorerTapStep, style: theme.textTheme.bodySmall),
            const SizedBox(height: 4),
          ],
          for (final (index, challenge) in lesson.challenges.indexed)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: IconDisc(
                challenge.passed ? 'check' : (isAppStep(challenge) ? 'grid' : 'code'),
                size: 36,
                background: challenge.passed ? p.sage600 : p.sand200,
                color: challenge.passed ? p.sage100 : p.muted,
              ),
              title: Text(t.lessonStep(index + 1)),
              subtitle: Text(challenge.passed ? t.lessonStepDone : challenge.title),
              trailing: isAppStep(challenge)
                  ? KcpIcon(
                      Directionality.of(context) == TextDirection.rtl ? 'chevL' : 'chevR',
                      size: 20,
                      color: p.muted,
                    )
                  : null,
              onTap: isAppStep(challenge)
                  ? () => context.push('/lesson/${lesson.id}/step/${challenge.id}')
                  : null,
            ),
          if (!lesson.challenges.every(isAppStep)) ...[
            const SizedBox(height: 8),
            LaptopHint(path: '/$language/learn/${lesson.id}'),
          ],
        ],
        const SizedBox(height: 24),
      ],
    );
  }
}

/// Code blocks in the explainer: left-to-right, monospace, scrolling sideways.
class _CodeBlockBuilder extends MarkdownElementBuilder {
  @override
  bool isBlockElement() => true;

  @override
  Widget visitElementAfterWithContext(
    BuildContext context,
    md.Element element,
    TextStyle? preferredStyle,
    TextStyle? parentStyle,
  ) {
    final text = element.textContent;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: CodeBlock(text.trimRight().split('\n')),
    );
  }
}
