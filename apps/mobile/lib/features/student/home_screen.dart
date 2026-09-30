import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../auth/auth_controller.dart';
import '../../config/app_config.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../push/push_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import 'progress_widgets.dart';
import 'student_data.dart';

/// Today: who you are and your streak, today's goal, the lesson to pick up, today's
/// practice and your place on this week's board.
class StudentHomeScreen extends ConsumerWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final me = auth is SignedIn ? auth : null;
    final progress = ref.watch(progressProvider);
    final practice = ref.watch(practiceProvider);
    final overview = ref.watch(overviewProvider);
    final board = ref.watch(leaderboardProvider('global'));

    Future<void> refresh() async {
      ref.invalidate(progressProvider);
      ref.invalidate(practiceProvider);
      ref.invalidate(overviewProvider);
      ref.invalidate(leaderboardProvider('global'));
      await ref.read(progressProvider.future);
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: refresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              _Header(
                name: me?.name ?? '',
                avatarKey: me?.me.student?.avatarKey ?? 'rocket',
                progress: progress.value,
              ),
              const SizedBox(height: 16),
              switch (progress) {
                AsyncData(:final value) => GoalCard(progress: value),
                AsyncError(:final error) => ErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(progressProvider),
                ),
                _ => const SizedBox(height: 120, child: LoadingView()),
              },
              if (overview case AsyncData(:final value)) _ContinueCard(overview: value),
              const SizedBox(height: 12),
              if (practice case AsyncData(:final value)) _PracticeRow(practice: value),
              if (board case AsyncData(:final value)) ...[
                const SizedBox(height: 10),
                _BoardRow(board: value),
              ],
              const _ReminderCard(),
              const SizedBox(height: 12),
              const LaptopHint(),
            ],
          ),
        ),
      ),
    );
  }
}

/// The avatar, level and XP, the greeting, the streak and the bell.
class _Header extends StatelessWidget {
  const _Header({required this.name, required this.avatarKey, required this.progress});

  final String name;
  final String avatarKey;
  final ProgressDto? progress;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final progress = this.progress;
    return Row(
      children: [
        KcpAvatar(avatarKey, size: 46),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (progress != null)
                Text(
                  t.levelAndXp(progress.level.number.toInt(), progress.xpTotal.toInt()),
                  style: theme.textTheme.labelMedium?.copyWith(color: p.muted),
                ),
              Semantics(
                header: true,
                child: Text(t.homeGreeting(name), style: theme.textTheme.headlineSmall),
              ),
            ],
          ),
        ),
        if (progress != null)
          KcpPill(
            icon: 'flame',
            label: '${progress.streak.current}',
            semanticLabel: t.streakDays(progress.streak.current.toInt()),
          ),
        const SizedBox(width: 4),
        IconButton(
          tooltip: t.notificationsTitle,
          style: IconButton.styleFrom(backgroundColor: p.surface),
          icon: const KcpIcon('bell', size: 20),
          onPressed: () => context.push('/notifications'),
        ),
      ],
    );
  }
}

/// The terracotta card: the next lesson, and a button straight into it.
class _ContinueCard extends StatelessWidget {
  const _ContinueCard({required this.overview});

  final LearningOverviewDto overview;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final nextId = overview.nextLessonId;
    if (nextId == null) return const SizedBox.shrink();
    LessonSummaryDto? next;
    ModuleDto? module;
    var number = 0;
    for (final track in overview.tracks) {
      for (final m in track.modules) {
        for (final (index, lesson) in m.lessons.indexed) {
          if (lesson.id == nextId) {
            next = lesson;
            module = m;
            number = index + 1;
          }
        }
      }
    }
    if (next == null || module == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Material(
        color: p.primary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KcpRadius.card)),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            PositionedDirectional(
              end: -50,
              top: -60,
              child: Container(
                width: 170,
                height: 170,
                decoration: BoxDecoration(color: p.primaryHover, shape: BoxShape.circle),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Kicker(t.continueKicker, color: p.onPrimary),
                  const SizedBox(height: 6),
                  Text(
                    next.title,
                    style: theme.textTheme.headlineSmall?.copyWith(color: p.onPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    t.continueLesson(number, module.title),
                    style: theme.textTheme.labelMedium?.copyWith(color: p.onPrimary),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.push('/lesson/$nextId'),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(child: Text(t.continueAction)),
                        const SizedBox(width: 8),
                        const KcpIcon('arrow', size: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Today's practice: a sage row into the quick questions.
class _PracticeRow extends ConsumerWidget {
  const _PracticeRow({required this.practice});

  final PracticeDto practice;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    final answered = practice.answeredQuizIds.length;
    final total = practice.total.toInt();
    final subtitle = total == 0
        ? t.practiceNone
        : practice.done
        ? t.practiceDoneToday
        : answered > 0
        ? t.practiceProgress(answered, total)
        : t.practiceRow(total, practice.xp.toInt());
    return RowCard(
      key: const ValueKey('practice-row'),
      icon: practice.done ? 'check' : 'target',
      title: t.practiceTitle,
      subtitle: subtitle,
      color: p.sage100,
      iconBackground: p.sage600,
      iconColor: p.sage100,
      onTap: total == 0 || practice.done
          ? null
          : () async {
              await context.push('/practice');
              // Back from the practice: show where it stands now.
              if (context.mounted) {
                ref.invalidate(practiceProvider);
                ref.invalidate(progressProvider);
              }
            },
    );
  }
}

/// This week's place on the world board (or the XP, when the family keeps it private).
class _BoardRow extends StatelessWidget {
  const _BoardRow({required this.board});

  final LeaderboardDto board;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    final me = board.me;
    final rank = me.hidden ? null : me.rank?.toInt();
    return RowCard(
      icon: 'trophy',
      title: rank == null ? t.tabLeaderboard : t.boardRankWorld(rank),
      subtitle: t.boardThisWeek(me.xp.toInt()),
      iconBackground: p.canvas,
      iconColor: p.ink,
      onTap: () => context.go('/leaderboard'),
    );
  }
}

/// Offers the streak reminder once (push is off until someone turns it on).
class _ReminderCard extends ConsumerStatefulWidget {
  const _ReminderCard();

  @override
  ConsumerState<_ReminderCard> createState() => _ReminderCardState();
}

class _ReminderCardState extends ConsumerState<_ReminderCard> {
  static const _dismissedKey = 'kcp.reminderCardDismissed';
  bool _hidden = false;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final push = ref.watch(pushServiceProvider);
    final prefs = ref.watch(sharedPreferencesProvider);
    if (_hidden || !push.available || push.optedIn || (prefs.getBool(_dismissedKey) ?? false)) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: SectionCard(
        color: context.kcp.brand100,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const IconDisc('bell', size: 36),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(t.reminderCardTitle, style: Theme.of(context).textTheme.titleMedium),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(t.reminderCardBody),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton(
                  onPressed: () async {
                    await ref.read(pushServiceProvider).requestPermissionAndRegister();
                    if (mounted) setState(() => _hidden = true);
                  },
                  child: Text(t.reminderCardAction),
                ),
                TextButton(
                  onPressed: () async {
                    await prefs.setBool(_dismissedKey, true);
                    if (mounted) setState(() => _hidden = true);
                  },
                  child: Text(t.reminderCardDismiss),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Code challenges and projects need a keyboard: they are on the website.
class LaptopHint extends ConsumerWidget {
  const LaptopHint({super.key, this.path});

  /// A page of the website to name (e.g. the lesson), else its home.
  final String? path;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    final config = ref.watch(appConfigProvider);
    final address = Uri.parse(config.webUrl).host + (path ?? '');
    return SectionCard(
      color: p.raised,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconDisc('laptop', size: 40, background: p.sand200, color: p.ink),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.laptopTitle, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(t.laptopBody, style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 6),
                Directionality(
                  textDirection: TextDirection.ltr,
                  child: SelectableText(
                    address,
                    style: TextStyle(fontWeight: FontWeight.w700, color: p.brandText),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
