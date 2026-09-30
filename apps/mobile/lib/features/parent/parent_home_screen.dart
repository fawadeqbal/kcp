import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../auth/auth_controller.dart';
import '../../config/app_config.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import '../../widgets/parental_gate.dart';
import 'parent_data.dart';
import 'premium_text.dart';

/// The parent's home: each child's progress with the streak reminder switch, the
/// plan's status (read only: the app never leads to buying anything, store rules),
/// and a way to add a child on the website (behind the parental gate).
class ParentHomeScreen extends ConsumerWidget {
  const ParentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final auth = ref.watch(authControllerProvider);
    final children = ref.watch(childrenProvider);
    final billing = ref.watch(billingProvider);
    final config = ref.watch(appConfigProvider);
    final language = ref.watch(appLanguageProvider);
    final mustAcceptTerms = auth is SignedIn && auth.me.mustAcceptTerms;

    Future<void> refresh() async {
      ref.invalidate(childrenProvider);
      ref.invalidate(billingProvider);
      await ref.read(authControllerProvider.notifier).reloadMe().catchError((_) {});
      await ref.read(childrenProvider.future);
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: refresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.parentKicker,
                          style: theme.textTheme.labelMedium?.copyWith(color: p.muted),
                        ),
                        Semantics(
                          header: true,
                          child: Text(
                            auth is SignedIn ? t.parentGreeting(auth.name) : t.parentTitle,
                            style: theme.textTheme.headlineMedium,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: t.notificationsTitle,
                    style: IconButton.styleFrom(backgroundColor: p.surface),
                    icon: const KcpIcon('bell', size: 20),
                    onPressed: () => context.push('/notifications'),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    tooltip: t.settingsTitle,
                    style: IconButton.styleFrom(backgroundColor: p.surface),
                    icon: const KcpIcon('settings', size: 20),
                    onPressed: () => context.push('/settings'),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              if (mustAcceptTerms) ...[
                SectionCard(
                  color: p.warnSoft,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t.termsChanged, style: TextStyle(color: p.warnText)),
                      const SizedBox(height: 10),
                      OutlinedButton(
                        onPressed: () =>
                            openExternalLink(context, config.webPage(language, '/dashboard')),
                        child: Text(t.openWebsite),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              switch (children) {
                AsyncData(:final value) when value.isEmpty => SectionCard(
                  child: Text(t.parentNoChildren),
                ),
                AsyncData(:final value) => Column(
                  children: [
                    for (final child in value) ...[
                      _ChildCard(child: child),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
                AsyncError(:final error) => ErrorView(
                  error: error,
                  onRetry: () => ref.invalidate(childrenProvider),
                ),
                _ => const SizedBox(height: 160, child: LoadingView()),
              },
              SectionCard(
                color: p.sage100,
                radius: KcpRadius.row,
                child: Row(
                  children: [
                    KcpIcon('shield', size: 20, color: p.sage800),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        t.parentSafetyNote,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: p.sage800,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (billing case AsyncData(:final value)) _PlanCard(billing: value),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 8, 20, 16),
        child: FilledButton(
          onPressed: () => openExternalLink(context, config.webPage(language, '/children/new')),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const KcpIcon('userPlus', size: 18),
              const SizedBox(width: 8),
              Text(t.addChild),
            ],
          ),
        ),
      ),
    );
  }
}

/// A child: avatar, name and last login; once they've logged in, three numbers and the
/// streak reminder switch (behind the parental gate).
class _ChildCard extends ConsumerStatefulWidget {
  const _ChildCard({required this.child});

  final ChildDto child;

  @override
  ConsumerState<_ChildCard> createState() => _ChildCardState();
}

class _ChildCardState extends ConsumerState<_ChildCard> {
  bool? _reminders;
  bool _busy = false;

  Future<void> _setReminders(bool on) async {
    if (!await passParentalGate(context)) return;
    if (!mounted) return;
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    try {
      final response = await ref
          .read(apiProvider)
          .getChildrenApi()
          .childrenUpdate(
            id: widget.child.id,
            updateChildDto: UpdateChildDto(streakReminders: on),
          );
      if (!mounted) return;
      setState(() => _reminders = response.data!.streakReminders);
      messenger.showSnackBar(SnackBar(content: Text(t.saved)));
      ref.invalidate(childrenProvider);
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(t, error))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final p = context.kcp;
    final child = widget.child;
    final lastLogin = child.lastLoginAt;
    final seen = lastLogin != null;
    return SectionCard(
      radius: KcpRadius.card,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(KcpRadius.row),
            onTap: () => context.push('/parent/child/${child.id}'),
            child: Row(
              children: [
                KcpAvatar(child.avatarKey, size: 48),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(child.nickname, style: theme.textTheme.titleLarge),
                      Text(
                        seen
                            ? t.lastSignedIn(
                                MaterialLocalizations.of(
                                  context,
                                ).formatMediumDate(lastLogin.toLocal()),
                              )
                            : t.neverSignedIn,
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                KcpIcon('chevR', size: 20, color: p.muted),
              ],
            ),
          ),
          if (seen) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                _Stat(value: child.level.toInt(), label: t.statLevel, accent: true),
                const SizedBox(width: 8),
                _Stat(value: child.streak.toInt(), label: t.statStreak),
                const SizedBox(width: 8),
                _Stat(value: child.lessonsCompleted.toInt(), label: t.statLessons),
              ],
            ),
            const SizedBox(height: 6),
            MergeSemantics(
              child: Row(
                children: [
                  Switch(
                    value: _reminders ?? child.streakReminders,
                    onChanged: _busy ? null : _setReminders,
                  ),
                  const SizedBox(width: 8),
                  Expanded(child: Text(t.streakReminders, style: theme.textTheme.titleSmall)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          Text(
            premiumText(context, child.premiumSource?.value, child.premiumUntil),
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, this.accent = false});

  final int value;
  final String label;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final p = context.kcp;
    return Expanded(
      child: MergeSemantics(
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 10, 10, 12),
          decoration: BoxDecoration(
            color: p.raised,
            borderRadius: BorderRadius.circular(KcpRadius.well),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: theme.textTheme.titleLarge?.copyWith(color: accent ? p.brandText : p.ink),
              ),
              Text(label, style: theme.textTheme.labelSmall?.copyWith(color: p.muted)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.billing});

  final BillingDto billing;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final subscription = billing.subscription;
    final status = switch (subscription?.status) {
      SubscriptionDtoStatusEnum.ACTIVE when subscription!.cancelAtPeriodEnd => t.planEnding(
        MaterialLocalizations.of(context).formatMediumDate(subscription.currentPeriodEnd.toLocal()),
      ),
      SubscriptionDtoStatusEnum.ACTIVE => t.planActive(
        MaterialLocalizations.of(
          context,
        ).formatMediumDate(subscription!.currentPeriodEnd.toLocal()),
      ),
      SubscriptionDtoStatusEnum.PAST_DUE => t.planPastDue,
      _ => t.planNone,
    };
    return SectionCard(
      radius: KcpRadius.row,
      child: Row(
        children: [
          const IconDisc('card', size: 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  header: true,
                  child: Text(t.planTitle, style: Theme.of(context).textTheme.titleSmall),
                ),
                const SizedBox(height: 2),
                Text(status, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
