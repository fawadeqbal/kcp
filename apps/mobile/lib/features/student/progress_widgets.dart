import 'package:flutter/material.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

/// Today's goal: XP earned today against the goal that keeps the streak going.
class GoalCard extends StatelessWidget {
  const GoalCard({super.key, required this.progress});

  final ProgressDto progress;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final streak = progress.streak;
    final today = progress.today;
    final goal = today.goalXp.toInt();
    final earned = today.xp.toInt().clamp(0, goal);
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(t.goalTitle, style: theme.textTheme.titleSmall)),
              if (streak.freezes > 0) ...[
                Tooltip(
                  message: t.streakFreezes(streak.freezes.toInt()),
                  child: KcpPill(
                    icon: 'snow',
                    label: '${streak.freezes}',
                    background: p.raised,
                    color: p.ink,
                    semanticLabel: t.streakFreezes(streak.freezes.toInt()),
                  ),
                ),
                const SizedBox(width: 8),
              ],
              Flexible(child: Text(t.goalProgress(earned, goal), style: theme.textTheme.bodySmall)),
            ],
          ),
          const SizedBox(height: 10),
          Semantics(
            label: t.goalToday(earned, goal),
            child: ExcludeSemantics(child: KcpMeter(fraction: goal == 0 ? 1 : earned / goal)),
          ),
          const SizedBox(height: 8),
          Text(
            streak.doneToday || earned >= goal ? t.goalDone : t.goalMore(goal - earned),
            style: theme.textTheme.bodySmall,
          ),
          if (streak.freezesNeeded > 0) ...[
            const SizedBox(height: 4),
            Text(
              t.streakFreezeUsed(streak.freezesNeeded.toInt()),
              style: theme.textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

/// Level and XP, with how far it is to the next level.
class XpBar extends StatelessWidget {
  const XpBar({super.key, required this.progress});

  final ProgressDto progress;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final level = progress.level;
    final xp = progress.xpTotal.toInt();
    final next = level.nextMinXp?.toInt();
    final start = level.minXp.toInt();
    final fraction = next == null || next <= start
        ? 1.0
        : ((xp - start) / (next - start)).clamp(0.0, 1.0);
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Wraps onto two lines with large text or long translations.
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            children: [
              Text(
                t.levelNumber(level.number.toInt()),
                style: theme.textTheme.headlineSmall?.copyWith(color: p.brandText),
              ),
              Text(t.xpTotal(xp), style: theme.textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 10),
          Semantics(
            label: t.xpBarLabel(level.number.toInt() + 1),
            value: '${(fraction * 100).round()}%',
            child: KcpMeter(fraction: fraction, color: p.brand),
          ),
          const SizedBox(height: 8),
          Text(
            next == null ? t.levelTop : t.xpToNext(next - xp, level.number.toInt() + 1),
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
