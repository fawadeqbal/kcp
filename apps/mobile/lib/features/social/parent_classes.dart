import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import '../../widgets/parental_gate.dart';

/// A parent's children's requests to join a teacher's class.
final parentClassRequestsProvider = FutureProvider.autoDispose<List<ParentClassRequestDto>>((
  ref,
) async {
  final api = ref.watch(apiProvider);
  return (await api.getSchoolsApi().parentClassesRequests()).data!;
});

/// The children's requests to join a class, on the parent's home (only when there are
/// some): the class, school and teacher; approve or decline behind the parental gate.
class ClassRequestsSection extends ConsumerStatefulWidget {
  const ClassRequestsSection({super.key});

  @override
  ConsumerState<ClassRequestsSection> createState() => _ClassRequestsSectionState();
}

class _ClassRequestsSectionState extends ConsumerState<ClassRequestsSection> {
  String? _busy;

  Future<void> _decide(ParentClassRequestDto request, bool approve) async {
    if (!await passParentalGate(context)) return;
    if (!mounted) return;
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = '${request.classId}:${request.child.id}');
    try {
      final response = await ref
          .read(apiProvider)
          .getSchoolsApi()
          .parentClassesDecide(
            classId: request.classId,
            classDecisionDto: ClassDecisionDto(childId: request.child.id, approve: approve),
          );
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            response.data!.status == ClassDecisionResultDtoStatusEnum.APPROVED
                ? t.parentClassApproved(request.child.nickname, request.className)
                : t.parentClassDeclined(request.child.nickname, request.className),
          ),
        ),
      );
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(t, error))));
    } finally {
      ref.invalidate(parentClassRequestsProvider);
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final requests = ref.watch(parentClassRequestsProvider).value ?? const [];
    if (requests.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(t.parentClassesTitle, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: 4),
            Text(t.parentClassesIntro, style: theme.textTheme.bodySmall),
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
                          t.parentClassRequest(
                            request.child.nickname,
                            request.className,
                            request.school,
                          ),
                          style: theme.textTheme.titleSmall,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          t.parentClassTeacher(request.teacher),
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
