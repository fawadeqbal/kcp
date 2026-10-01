import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import '../../widgets/parental_gate.dart';
import 'social_data.dart';

/// The children's friend requests on the parent's home (only when there are some):
/// approve or decline each, behind the parental gate.
class FriendRequestsSection extends ConsumerStatefulWidget {
  const FriendRequestsSection({super.key});

  @override
  ConsumerState<FriendRequestsSection> createState() => _FriendRequestsSectionState();
}

class _FriendRequestsSectionState extends ConsumerState<FriendRequestsSection> {
  String? _busy;

  Future<void> _decide(ParentFriendRequestDto request, bool approve) async {
    if (!await passParentalGate(context)) return;
    if (!mounted) return;
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = request.id);
    try {
      final response = await ref
          .read(apiProvider)
          .getFriendsApi()
          .parentFriendsDecide(
            id: request.id,
            friendDecisionDto: FriendDecisionDto(approve: approve),
          );
      final status = response.data!.status;
      messenger.showSnackBar(
        SnackBar(
          content: Text(switch (status) {
            ParentFriendDecisionResultDtoStatusEnum.APPROVED => t.parentFriendDone(
              request.child.nickname,
              request.other.nickname,
            ),
            ParentFriendDecisionResultDtoStatusEnum.DECLINED => t.parentFriendDeclined(
              request.child.nickname,
            ),
            _ => t.parentFriendApproved,
          }),
        ),
      );
      ref.invalidate(parentFriendRequestsProvider);
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(t, error))));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final requests = ref.watch(parentFriendRequestsProvider).value ?? const [];
    if (requests.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(t.parentFriendRequests, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: 4),
            Text(t.parentFriendsIntro, style: theme.textTheme.bodySmall),
            for (final request in requests) ...[
              const Divider(height: 24),
              Row(
                children: [
                  KcpAvatar(request.child.avatarKey, size: 36),
                  const SizedBox(width: 6),
                  KcpAvatar(request.other.avatarKey, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      request.direction == ParentFriendRequestDtoDirectionEnum.sent
                          ? t.parentFriendSent(request.child.nickname, request.other.nickname)
                          : t.parentFriendReceived(request.other.nickname, request.child.nickname),
                      style: theme.textTheme.titleSmall,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (request.waitingForYou)
                Wrap(
                  alignment: WrapAlignment.end,
                  spacing: 8,
                  children: [
                    OutlinedButton(
                      onPressed: _busy == null ? () => _decide(request, false) : null,
                      child: Text(t.parentFriendDecline),
                    ),
                    FilledButton(
                      onPressed: _busy == null ? () => _decide(request, true) : null,
                      child: Text(t.parentFriendApprove),
                    ),
                  ],
                )
              else
                Text(t.parentFriendWaitingOther, style: theme.textTheme.bodySmall),
            ],
          ],
        ),
      ),
    );
  }
}

/// A child's friends on the child's screen: end a friendship (behind the gate).
class ChildFriendsCard extends ConsumerWidget {
  const ChildFriendsCard({super.key, required this.childId, required this.nickname});

  final String childId;
  final String nickname;

  Future<void> _end(BuildContext context, WidgetRef ref, FriendDto friend) async {
    if (!await passParentalGate(context)) return;
    if (!context.mounted) return;
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(apiProvider)
          .getFriendsApi()
          .parentFriendsEndChildFriendship(id: childId, friendId: friend.userId);
      messenger.showSnackBar(SnackBar(content: Text(t.childFriendsEnded)));
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(t, error))));
    }
    ref.invalidate(childFriendsProvider(childId));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final friends = ref.watch(childFriendsProvider(childId)).value;
    if (friends == null) return const SizedBox.shrink();
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(t.childFriendsTitle, style: theme.textTheme.titleMedium),
          ),
          const SizedBox(height: 8),
          if (friends.isEmpty)
            Text(t.childFriendsNone(nickname), style: theme.textTheme.bodySmall)
          else
            for (final friend in friends)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    KcpAvatar(friend.avatarKey, size: 34),
                    const SizedBox(width: 10),
                    Expanded(child: Text(friend.nickname, style: theme.textTheme.titleSmall)),
                    TextButton(
                      style: TextButton.styleFrom(foregroundColor: p.dangerText),
                      onPressed: () => _end(context, ref, friend),
                      child: Text(t.childFriendsEnd),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
