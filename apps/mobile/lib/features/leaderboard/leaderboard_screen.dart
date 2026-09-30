import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import '../student/student_data.dart';

/// This week's leaderboard: the world, or the student's country, region or city.
class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  String _scope = 'global';

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final board = ref.watch(leaderboardProvider(_scope));
    return Scaffold(
      appBar: AppBar(title: Text(t.leaderboardTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'global', label: Text(t.boardGlobal)),
                ButtonSegment(value: 'country', label: Text(t.boardCountry)),
                ButtonSegment(value: 'region', label: Text(t.boardRegion)),
                ButtonSegment(value: 'city', label: Text(t.boardCity)),
              ],
              selected: {_scope},
              showSelectedIcon: false,
              onSelectionChanged: (value) => setState(() => _scope = value.first),
            ),
          ),
          const SizedBox(height: 8),
          Text(t.boardWeek, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 12),
          switch (board) {
            AsyncData(:final value) => _Board(board: value),
            AsyncError(:final error) => ErrorView(
              error: error,
              onRetry: () => ref.invalidate(leaderboardProvider(_scope)),
            ),
            _ => const SizedBox(height: 200, child: LoadingView()),
          },
        ],
      ),
    );
  }
}

class _Board extends StatelessWidget {
  const _Board({required this.board});

  final LeaderboardDto board;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    if (!board.available) {
      return SectionCard(child: Text(t.boardTooFew(board.minStudents.toInt())));
    }
    final me = board.me;
    final meInList = board.entries.any((entry) => entry.isMe);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (board.areaName != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(board.areaName!, style: Theme.of(context).textTheme.titleMedium),
          ),
        if (board.entries.isEmpty) SectionCard(child: Text(t.boardEmpty)),
        for (final entry in board.entries)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: _Row(
              rank: entry.rank.toInt(),
              name: entry.nickname,
              avatarKey: entry.avatarKey,
              xp: entry.xp.toInt(),
              isMe: entry.isMe,
            ),
          ),
        const SizedBox(height: 12),
        if (me.hidden)
          SectionCard(child: Text(t.boardHidden))
        else if (!meInList)
          SectionCard(
            child: Text(
              me.rank == null
                  ? t.boardMeNoRank(me.xp.toInt())
                  : t.boardMeRank(me.rank!.toInt(), me.xp.toInt()),
            ),
          ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.rank,
    required this.name,
    required this.avatarKey,
    required this.xp,
    required this.isMe,
  });

  final int rank;
  final String name;
  final String avatarKey;
  final int xp;
  final bool isMe;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    // The top three get a coloured medal.
    final (medal, onMedal) = switch (rank) {
      1 => (p.primary, p.onPrimary),
      2 => (p.sage700, p.sage100),
      3 => (p.brand300, p.brand900),
      _ => (Colors.transparent, p.ink),
    };
    return MergeSemantics(
      child: Container(
        padding: const EdgeInsetsDirectional.fromSTEB(10, 8, 16, 8),
        decoration: BoxDecoration(
          color: isMe ? p.brand100 : p.surface,
          borderRadius: BorderRadius.circular(KcpRadius.row),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: medal, shape: BoxShape.circle),
              child: Text('$rank', style: kcpDisplay('en', size: 16, color: onMedal)),
            ),
            const SizedBox(width: 10),
            KcpAvatar(avatarKey, size: 34),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: theme.textTheme.titleSmall),
                  if (isMe) Text(t.boardYou, style: theme.textTheme.bodySmall),
                ],
              ),
            ),
            Text(t.xpTotal(xp), style: theme.textTheme.titleSmall),
          ],
        ),
      ),
    );
  }
}
