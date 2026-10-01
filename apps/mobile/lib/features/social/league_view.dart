import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import 'social_data.dart';

/// A league's medal: its colour and a trophy (the league's name sits next to it).
class LeagueMedal extends StatelessWidget {
  const LeagueMedal(this.tier, {super.key, this.size = 56});

  final String tier;
  final double size;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: leagueColours[tier], shape: BoxShape.circle),
        alignment: Alignment.center,
        child: KcpIcon('trophy', size: size * 0.5, color: const Color(0xFF201E1D)),
      ),
    );
  }
}

/// The student's league this week: their group, who moves up and down, and last
/// week's result (shown once).
class LeagueView extends ConsumerStatefulWidget {
  const LeagueView({super.key});

  @override
  ConsumerState<LeagueView> createState() => _LeagueViewState();
}

class _LeagueViewState extends ConsumerState<LeagueView> {
  bool _resultSeen = false;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final league = ref.watch(leagueProvider);
    return switch (league) {
      AsyncData(:final value) => RefreshIndicator(
        onRefresh: () => ref.refresh(leagueProvider.future),
        child: _body(context, t, value),
      ),
      AsyncError(:final error) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(leagueProvider),
      ),
      _ => const LoadingView(),
    };
  }

  Widget _body(BuildContext context, AppLocalizations t, LeagueDto league) {
    final theme = Theme.of(context);
    final p = context.kcp;
    final index = league.tierIndex.toInt();
    final tier = league.tier.value;
    final above = index + 1 < leagueTiers.length ? leagueTiers[index + 1] : null;
    final below = index > 0 ? leagueTiers[index - 1] : null;
    final result = _resultSeen ? null : league.lastResult;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        Row(
          children: [
            LeagueMedal(tier),
            const SizedBox(width: 14),
            Expanded(
              child: Semantics(
                header: true,
                child: Text(
                  t.leagueTitle(leagueTierName(t, tier)),
                  style: theme.textTheme.headlineSmall,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(t.leagueIntro, style: theme.textTheme.bodyMedium?.copyWith(color: p.muted)),
        if (result != null) ...[
          const SizedBox(height: 14),
          Semantics(
            liveRegion: true,
            child: SectionCard(
              color: result.outcome == LeagueResultDtoOutcomeEnum.RELEGATED ? p.sand200 : p.sage100,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      LeagueMedal(result.newTier.value, size: 40),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(switch (result.outcome) {
                          LeagueResultDtoOutcomeEnum.PROMOTED => t.leagueResultPromoted(
                            result.rank.toInt(),
                            leagueTierName(t, result.tier.value),
                            leagueTierName(t, result.newTier.value),
                          ),
                          LeagueResultDtoOutcomeEnum.RELEGATED => t.leagueResultRelegated(
                            result.rank.toInt(),
                            leagueTierName(t, result.tier.value),
                            leagueTierName(t, result.newTier.value),
                          ),
                          _ => t.leagueResultStayed(
                            result.rank.toInt(),
                            leagueTierName(t, result.tier.value),
                          ),
                        }, style: const TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() => _resultSeen = true);
                        unawaited(
                          ref
                              .read(apiProvider)
                              .getProgressApi()
                              .progressLeagueSeen()
                              .then((_) => null, onError: (_) => null),
                        );
                      },
                      child: Text(t.leagueOk),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
        if (!league.joined)
          SectionCard(child: Text(t.leagueNotJoined))
        else ...[
          Text(
            above != null && league.promoteCount > 0
                ? t.leagueZoneUp(league.promoteCount.toInt(), leagueTierName(t, above))
                : t.leagueTopTier,
            style: theme.textTheme.bodySmall,
          ),
          if (below != null && league.relegateCount > 0)
            Text(
              t.leagueZoneDown(league.relegateCount.toInt(), leagueTierName(t, below)),
              style: theme.textTheme.bodySmall,
            ),
          const SizedBox(height: 10),
          for (final row in league.standings)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: _StandingRow(row: row),
            ),
        ],
        const SizedBox(height: 12),
        Text(t.leagueSafety, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

class _StandingRow extends StatelessWidget {
  const _StandingRow({required this.row});

  final LeagueStandingDto row;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final zone = row.zone;
    final zoneColour = switch (zone) {
      LeagueStandingDtoZoneEnum.up => p.sage600,
      LeagueStandingDtoZoneEnum.down => p.danger,
      _ => Colors.transparent,
    };
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsetsDirectional.fromSTEB(10, 8, 16, 8),
        decoration: BoxDecoration(
          color: row.isMe ? p.brand100 : p.surface,
          borderRadius: BorderRadius.circular(KcpRadius.row),
          border: BorderDirectional(start: BorderSide(color: zoneColour, width: 4)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 30,
              child: Text(
                '${row.rank}',
                textAlign: TextAlign.center,
                style: kcpDisplay('en', size: 16, color: p.ink),
              ),
            ),
            const SizedBox(width: 8),
            if (row.avatarKey != null)
              KcpAvatar(row.avatarKey!, size: 34)
            else
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(color: p.sand300, shape: BoxShape.circle),
                alignment: Alignment.center,
                child: KcpIcon('user', size: 18, color: p.muted),
              ),
            const SizedBox(width: 10),
            Expanded(
              child: Wrap(
                spacing: 6,
                runSpacing: 2,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    row.nickname ?? t.leagueHiddenPlayer,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: row.nickname == null ? p.muted : null,
                    ),
                  ),
                  if (row.isMe)
                    KcpPill(label: t.boardYou, background: p.primary, color: p.onPrimary),
                  if (row.isFriend)
                    KcpPill(label: t.leagueFriend, background: p.sage200, color: p.sage800),
                  if (zone == LeagueStandingDtoZoneEnum.up ||
                      zone == LeagueStandingDtoZoneEnum.down)
                    Semantics(
                      label: zone == LeagueStandingDtoZoneEnum.up
                          ? t.leagueMovesUp
                          : t.leagueMovesDown,
                      child: const SizedBox.shrink(),
                    ),
                ],
              ),
            ),
            Text(t.xpTotal(row.xp.toInt()), style: theme.textTheme.titleSmall),
          ],
        ),
      ),
    );
  }
}
