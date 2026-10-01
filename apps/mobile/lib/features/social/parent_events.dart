import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import '../../widgets/parental_gate.dart';

/// A parent's children's requests to join hackathon teams.
final parentEventRequestsProvider = FutureProvider.autoDispose<List<ParentEventRequestDto>>((
  ref,
) async {
  final api = ref.watch(apiProvider);
  return (await api.getEventsApi().parentEventsRequests()).data!;
});

/// The children's requests to join a hackathon team, on the parent's home (only when
/// there are some): the event, the team and who is in it; approve or decline behind
/// the parental gate.
class EventRequestsSection extends ConsumerStatefulWidget {
  const EventRequestsSection({super.key});

  @override
  ConsumerState<EventRequestsSection> createState() => _EventRequestsSectionState();
}

class _EventRequestsSectionState extends ConsumerState<EventRequestsSection> {
  String? _busy;

  Future<void> _decide(ParentEventRequestDto request, bool approve) async {
    if (!await passParentalGate(context)) return;
    if (!mounted) return;
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = '${request.teamId}:${request.child.id}');
    try {
      final response = await ref
          .read(apiProvider)
          .getEventsApi()
          .parentEventsDecide(
            teamId: request.teamId,
            eventDecisionDto: EventDecisionDto(childId: request.child.id, approve: approve),
          );
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            response.data!.status == EventDecisionResultDtoStatusEnum.APPROVED
                ? t.parentEventApproved(request.child.nickname, request.team.name)
                : t.parentEventDeclined(request.child.nickname, request.team.name),
          ),
        ),
      );
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(t, error))));
    } finally {
      ref.invalidate(parentEventRequestsProvider);
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final dates = MaterialLocalizations.of(context);
    final requests = ref.watch(parentEventRequestsProvider).value ?? const [];
    if (requests.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(t.parentEventsTitle, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: 4),
            Text(t.parentEventsIntro, style: theme.textTheme.bodySmall),
            for (final request in requests) ...[
              const Divider(height: 24),
              Row(
                children: [
                  KcpAvatar(request.child.avatarKey, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.parentEventRequest(
                            request.child.nickname,
                            request.team.name,
                            request.event.title,
                          ),
                          style: theme.textTheme.titleSmall,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${t.parentEventWhen(dates.formatMediumDate(request.event.startsAt.toLocal()), dates.formatMediumDate(request.event.endsAt.toLocal()))}'
                          ' · '
                          '${request.team.members.isEmpty ? t.parentEventNewTeam : t.parentEventWith(request.team.members.join(', '))}',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                alignment: WrapAlignment.end,
                spacing: 8,
                children: [
                  OutlinedButton(
                    onPressed: _busy == null ? () => _decide(request, false) : null,
                    child: Text(t.parentEventDecline),
                  ),
                  FilledButton(
                    onPressed: _busy == null ? () => _decide(request, true) : null,
                    child: Text(t.parentEventApprove),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
