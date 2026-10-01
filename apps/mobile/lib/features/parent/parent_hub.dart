import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../config/app_config.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/parental_gate.dart';

/// The hub (paid client projects, 15+): projects a child accepted, waiting for the
/// parent's yes.
final parentHubApprovalsProvider = FutureProvider.autoDispose<List<ParentApprovalDto>>((ref) async {
  final api = ref.watch(apiProvider);
  final all = (await api.getHubApi().parentHubApprovals()).data!;
  return all.where((a) => a.status == ParentApprovalDtoStatusEnum.ACCEPTED).toList();
});

/// A child's hub earnings, or null when there's nothing to show (no earnings yet, or
/// the statement couldn't be loaded: the card then stays away rather than nag).
final childHubEarningsProvider = FutureProvider.autoDispose.family<EarningsStatementDto?, String>((
  ref,
  childId,
) async {
  final api = ref.watch(apiProvider);
  try {
    final statement = (await api.getHubApi().earningsChild(childId: childId)).data;
    return statement == null || statement.totals.isEmpty ? null : statement;
  } catch (_) {
    return null;
  }
});

const _zeroDecimal = {
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', //
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
};
const _threeDecimal = {'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'};

/// Digits of a currency's minor unit (ISO 4217, as the API counts them: 2 for PKR,
/// EGP, AED and SAR, where intl's own figure can differ).
int minorDigits(String currency) =>
    _zeroDecimal.contains(currency) ? 0 : (_threeDecimal.contains(currency) ? 3 : 2);

/// An amount in minor units (paisa, cents) in the app's language, like the website
/// shows it: "Rs 4,500", "$40.50" (whole amounts drop ".00").
String formatMinor(BuildContext context, num minor, String currency) {
  final digits = minorDigits(currency);
  final amount = minor / math.pow(10, digits);
  final whole = amount == amount.roundToDouble();
  return NumberFormat.simpleCurrency(
    locale: Localizations.localeOf(context).toLanguageTag(),
    name: currency,
    decimalDigits: whole ? 0 : digits,
  ).format(amount);
}

/// "45 min", "2 h", "1 h 30 min".
String formatMinutes(AppLocalizations t, num minutes) {
  final total = minutes.round();
  final hours = total ~/ 60;
  final rest = total % 60;
  if (hours == 0) return t.hubMinutes(rest);
  if (rest == 0) return t.hubHours(hours);
  return t.hubHoursMinutes(hours, rest);
}

/// Projects waiting for the parent's approval, on the parent's home (only when there
/// are some): what the work is, about how long it takes and what it earns; approve or
/// decline behind the parental gate.
class HubApprovalsSection extends ConsumerStatefulWidget {
  const HubApprovalsSection({super.key});

  @override
  ConsumerState<HubApprovalsSection> createState() => _HubApprovalsSectionState();
}

class _HubApprovalsSectionState extends ConsumerState<HubApprovalsSection> {
  String? _busy;

  Future<void> _decide(ParentApprovalDto approval, bool approve) async {
    if (!await passParentalGate(context)) return;
    if (!mounted) return;
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = approval.memberId);
    try {
      await ref
          .read(apiProvider)
          .getHubApi()
          .parentHubDecide(
            memberId: approval.memberId,
            parentDecisionDto: ParentDecisionDto(approve: approve),
          );
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            approve
                ? t.parentHubApproved(approval.nickname, approval.title)
                : t.parentHubDeclined(approval.nickname, approval.title),
          ),
        ),
      );
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(t, error))));
    } finally {
      ref.invalidate(parentHubApprovalsProvider);
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final approvals = ref.watch(parentHubApprovalsProvider).value ?? const [];
    if (approvals.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(t.parentHubTitle, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: 4),
            Text(t.parentHubIntro, style: theme.textTheme.bodySmall),
            for (final approval in approvals) ...[
              const Divider(height: 24),
              Text(
                t.parentHubRequest(approval.nickname, approval.title),
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 4),
              Text(approval.summary, maxLines: 4, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 8),
              for (final line in [
                if (approval.taskTitle case final task?) t.parentHubTask(task),
                if (approval.estimateMinutes case final minutes? when minutes > 0)
                  t.parentHubTime(formatMinutes(t, minutes)),
                if (approval.estimatedEarningsMinor case final minor? when minor > 0)
                  t.parentHubEarnings(formatMinor(context, minor, approval.currency)),
                if (approval.leadName case final lead?) t.parentHubLead(lead),
              ])
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(line, style: theme.textTheme.bodySmall),
                ),
              const SizedBox(height: 6),
              Text(t.parentHubSafety, style: theme.textTheme.bodySmall?.copyWith(color: p.muted)),
              const SizedBox(height: 10),
              Wrap(
                alignment: WrapAlignment.end,
                spacing: 8,
                children: [
                  OutlinedButton(
                    onPressed: _busy == null ? () => _decide(approval, false) : null,
                    child: Text(t.parentHubDecline),
                  ),
                  FilledButton(
                    onPressed: _busy == null ? () => _decide(approval, true) : null,
                    child: Text(t.parentHubApprove),
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

/// A child's hub earnings, on their page (only once there are some): earned, waiting
/// out the hold period, ready to pay out and paid, per currency. Payouts are confirmed
/// on the website.
class ChildEarningsCard extends ConsumerWidget {
  const ChildEarningsCard({super.key, required this.childId, required this.nickname});

  final String childId;
  final String nickname;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statement = ref.watch(childHubEarningsProvider(childId)).value;
    if (statement == null) return const SizedBox.shrink();
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final config = ref.watch(appConfigProvider);
    final language = ref.watch(appLanguageProvider);
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: SectionCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const IconDisc('wallet', size: 40),
                const SizedBox(width: 12),
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(t.childEarningsTitle, style: theme.textTheme.titleMedium),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(t.childEarningsBody(nickname), style: theme.textTheme.bodySmall),
            for (final total in statement.totals) ...[
              const SizedBox(height: 12),
              for (final (label, minor) in [
                (t.childEarningsEarned, total.earnedMinor),
                (t.childEarningsHeld, total.heldMinor),
                (t.childEarningsPayable, total.payableMinor),
                (t.childEarningsPaid, total.paidMinor),
              ])
                MergeSemantics(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            label,
                            style: theme.textTheme.bodyMedium?.copyWith(color: p.muted),
                          ),
                        ),
                        Text(
                          formatMinor(context, minor, total.currency),
                          style: theme.textTheme.titleSmall,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
            const SizedBox(height: 10),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: OutlinedButton(
                onPressed: () => openExternalLink(context, config.webPage(language, '/payouts')),
                child: Text(t.openWebsite),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
