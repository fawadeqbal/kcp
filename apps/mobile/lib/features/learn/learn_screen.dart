import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../student/student_data.dart';

/// All lessons, by track and module, with the student's progress.
class LearnScreen extends ConsumerWidget {
  const LearnScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final overview = ref.watch(overviewProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t.tabLearn)),
      body: switch (overview) {
        AsyncData(:final value) => RefreshIndicator(
          onRefresh: () => ref.refresh(overviewProvider.future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            children: [
              for (final track in value.tracks)
                for (final module in track.modules) ...[
                  Kicker(
                    track.ageFrom != null && track.ageTo != null
                        ? '${track.title} · ${t.explorerForAges(track.ageFrom!.toInt(), track.ageTo!.toInt())}'
                        : track.title,
                  ),
                  const SizedBox(height: 4),
                  Semantics(
                    header: true,
                    child: Text(module.title, style: Theme.of(context).textTheme.headlineSmall),
                  ),
                  const SizedBox(height: 12),
                  for (final lesson in module.lessons) ...[
                    _LessonTile(lesson: lesson),
                    const SizedBox(height: 8),
                  ],
                  const SizedBox(height: 16),
                ],
            ],
          ),
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(overviewProvider),
        ),
        _ => const LoadingView(),
      },
    );
  }
}

class _LessonTile extends StatelessWidget {
  const _LessonTile({required this.lesson});

  final LessonSummaryDto lesson;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    final (icon, background, color, status) = switch (lesson.status) {
      _ when lesson.locked => ('lock', p.sand200, p.muted, t.lessonLocked),
      LessonSummaryDtoStatusEnum.COMPLETED => ('check', p.sage600, p.sage100, t.lessonDone),
      LessonSummaryDtoStatusEnum.STARTED => ('play', p.primary, p.onPrimary, t.lessonStarted),
      _ => ('book', p.brand100, p.brandText, t.lessonNotStarted),
    };
    return RowCard(
      icon: icon,
      iconBackground: background,
      iconColor: color,
      color: lesson.status == LessonSummaryDtoStatusEnum.STARTED ? p.brand100 : null,
      title: lesson.title,
      subtitle: [
        status,
        if (lesson.quizCount > 0) t.lessonQuizCount(lesson.quizCount.toInt()),
        if (lesson.isPremium) t.premium,
      ].join(' · '),
      onTap: lesson.locked ? null : () => context.push('/lesson/${lesson.id}'),
    );
  }
}
