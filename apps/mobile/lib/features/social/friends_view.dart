import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import 'social_data.dart';

/// "K7MQ4X" → "K7M Q4X": easier to read out.
String spacedFriendCode(String code) =>
    code.length == 6 ? '${code.substring(0, 3)} ${code.substring(3)}' : code;

/// A student's friends: their code to give out, adding a friend by code (a parent of
/// each child approves), requests still waiting, and this week's XP together.
class FriendsView extends ConsumerStatefulWidget {
  const FriendsView({super.key});

  @override
  ConsumerState<FriendsView> createState() => _FriendsViewState();
}

class _FriendsViewState extends ConsumerState<FriendsView> {
  final _code = TextEditingController();
  bool _busy = false;
  bool _copied = false;
  ({bool ok, String text})? _message;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  void _reload() {
    ref.invalidate(friendsProvider);
    ref.invalidate(friendBoardProvider);
  }

  Future<void> _send() async {
    final t = AppLocalizations.of(context);
    if (_busy || _code.text.trim().isEmpty) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final response = await ref
          .read(apiProvider)
          .getFriendsApi()
          .friendsSend(sendFriendRequestDto: SendFriendRequestDto(code: _code.text.trim()));
      _code.clear();
      if (mounted) {
        setState(() => _message = (ok: true, text: t.friendsSent(response.data!.nickname)));
      }
      _reload();
    } catch (error) {
      if (mounted) setState(() => _message = (ok: false, text: errorText(t, error)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove(FriendBoardEntryDto friend) async {
    final t = AppLocalizations.of(context);
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(t.friendsRemoveTitle(friend.nickname)),
        content: Text(t.friendsRemoveBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(t.cancel)),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(t.friendsRemove)),
        ],
      ),
    );
    if (sure != true) return;
    try {
      await ref.read(apiProvider).getFriendsApi().friendsUnfriend(userId: friend.userId);
    } catch (_) {
      // Shown as it was on the next refresh.
    }
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final friends = ref.watch(friendsProvider);
    return switch (friends) {
      AsyncData(:final value) => RefreshIndicator(
        onRefresh: () async {
          _reload();
          await ref.read(friendsProvider.future);
        },
        child: _body(context, t, value),
      ),
      AsyncError(:final error) => ErrorView(error: error, onRetry: _reload),
      _ => const LoadingView(),
    };
  }

  Widget _body(BuildContext context, AppLocalizations t, FriendsDto friends) {
    final theme = Theme.of(context);
    final p = context.kcp;
    final board = ref.watch(friendBoardProvider).value;
    final waiting = [
      for (final r in friends.received) (request: r, mine: false),
      for (final r in friends.sent) (request: r, mine: true),
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t.friendsYourCode, style: theme.textTheme.titleMedium),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: Directionality(
                      textDirection: TextDirection.ltr,
                      child: SelectableText(
                        spacedFriendCode(friends.code),
                        style: theme.textTheme.headlineMedium?.copyWith(
                          color: p.brandText,
                          letterSpacing: 4,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: friends.code));
                      if (mounted) setState(() => _copied = true);
                    },
                    icon: KcpIcon(_copied ? 'check' : 'copy', size: 18),
                    label: Text(_copied ? t.friendsCopied : t.friendsCopy),
                  ),
                ],
              ),
              Text(t.friendsCodeHelp, style: theme.textTheme.bodySmall),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(t.friendsAdd, style: theme.textTheme.titleMedium),
              const SizedBox(height: 10),
              TextField(
                controller: _code,
                textDirection: TextDirection.ltr,
                textCapitalization: TextCapitalization.characters,
                autocorrect: false,
                enableSuggestions: false,
                decoration: InputDecoration(labelText: t.friendsCodeLabel),
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
              ),
              const SizedBox(height: 10),
              FilledButton.icon(
                onPressed: _busy ? null : _send,
                icon: const KcpIcon('userPlus', size: 18),
                label: Text(t.friendsSend),
              ),
            ],
          ),
        ),
        if (_message != null) ...[
          const SizedBox(height: 12),
          Semantics(
            liveRegion: true,
            child: SectionCard(
              color: _message!.ok ? p.sage100 : p.dangerSoft,
              radius: KcpRadius.row,
              padding: const EdgeInsets.all(14),
              child: Text(
                _message!.text,
                style: TextStyle(color: _message!.ok ? p.sage800 : p.dangerText),
              ),
            ),
          ),
        ],
        if (waiting.isNotEmpty) ...[
          const SizedBox(height: 20),
          Semantics(header: true, child: Text(t.friendsWaiting, style: theme.textTheme.titleLarge)),
          const SizedBox(height: 8),
          for (final (:request, :mine) in waiting)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: RowCard(
                icon: 'user',
                leading: KcpAvatar(request.avatarKey, size: 36),
                title: mine
                    ? t.friendsYouAsked(request.nickname)
                    : t.friendsTheyAsked(request.nickname),
                subtitle: switch (request.status) {
                  StudentFriendRequestDtoStatusEnum.DECLINED => t.friendsDeclined,
                  StudentFriendRequestDtoStatusEnum.EXPIRED => t.friendsExpired,
                  _ => t.friendsWaiting,
                },
              ),
            ),
        ],
        const SizedBox(height: 20),
        Semantics(header: true, child: Text(t.friendsBoard, style: theme.textTheme.titleLarge)),
        const SizedBox(height: 8),
        if (friends.friends.isEmpty)
          SectionCard(child: Text(t.friendsNone))
        else
          for (final entry in board?.entries ?? const <FriendBoardEntryDto>[])
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: MergeSemantics(
                child: Container(
                  padding: const EdgeInsetsDirectional.fromSTEB(12, 6, 4, 6),
                  decoration: BoxDecoration(
                    color: entry.isMe ? p.brand100 : p.surface,
                    borderRadius: BorderRadius.circular(KcpRadius.row),
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 26,
                        child: Text(
                          '${entry.rank}',
                          style: kcpDisplay('en', size: 16, color: p.ink),
                        ),
                      ),
                      KcpAvatar(entry.avatarKey, size: 34),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          entry.isMe ? '${entry.nickname} (${t.boardYou})' : entry.nickname,
                          style: theme.textTheme.titleSmall,
                        ),
                      ),
                      Text(t.xpTotal(entry.xp.toInt()), style: theme.textTheme.titleSmall),
                      if (entry.isMe)
                        const SizedBox(width: 48)
                      else
                        IconButton(
                          tooltip: '${t.friendsRemove}: ${entry.nickname}',
                          onPressed: () => _remove(entry),
                          icon: KcpIcon('x', size: 18, color: p.muted),
                        ),
                    ],
                  ),
                ),
              ),
            ),
      ],
    );
  }
}
