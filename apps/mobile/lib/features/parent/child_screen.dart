import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../config/app_config.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import '../../widgets/parental_gate.dart';
import 'parent_data.dart';
import 'premium_text.dart';

/// One child: progress, and the switches a parent controls. Every change asks the
/// parental gate first.
class ChildScreen extends ConsumerStatefulWidget {
  const ChildScreen({super.key, required this.childId});

  final String childId;

  @override
  ConsumerState<ChildScreen> createState() => _ChildScreenState();
}

class _ChildScreenState extends ConsumerState<ChildScreen> {
  ChildDto? _child;
  String? _busy;

  Future<void> _change(String what, Future<ChildDto> Function() request) async {
    if (!await passParentalGate(context)) return;
    if (!mounted) return;
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = what);
    try {
      final updated = await request();
      if (!mounted) return;
      setState(() => _child = updated);
      messenger.showSnackBar(SnackBar(content: Text(t.saved)));
      ref.invalidate(childrenProvider);
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text(errorText(t, error))));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final children = ref.watch(childrenProvider);
    final fromList = children.value?.where((c) => c.id == widget.childId).firstOrNull;
    final child = _child ?? fromList;
    return Scaffold(
      appBar: AppBar(title: Text(child?.nickname ?? t.childTitle)),
      body: switch ((child, children)) {
        (final ChildDto child, _) => _body(context, child),
        (_, AsyncError(:final error)) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(childrenProvider),
        ),
        (_, AsyncData()) => Center(child: Text(t.childNotFound)),
        _ => const LoadingView(),
      },
    );
  }

  Widget _body(BuildContext context, ChildDto child) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final api = ref.watch(apiProvider);
    final config = ref.watch(appConfigProvider);
    final language = ref.watch(appLanguageProvider);
    final consents = child.consents;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        Row(
          children: [
            KcpAvatar(child.avatarKey, size: 64),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(child.nickname, style: theme.textTheme.headlineSmall),
                  Directionality(
                    textDirection: TextDirection.ltr,
                    child: Text(child.username, style: theme.textTheme.bodySmall),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Stat(icon: 'star', text: t.levelNumber(child.level.toInt())),
              _Stat(icon: 'zap', text: t.xpTotal(child.xpTotal.toInt())),
              _Stat(icon: 'flame', text: t.streakDays(child.streak.toInt())),
              _Stat(icon: 'book', text: t.lessonsDone(child.lessonsCompleted.toInt())),
              _Stat(icon: 'award', text: t.badgesCount(child.badges.toInt())),
              _Stat(
                icon: 'sparkle',
                text: premiumText(context, child.premiumSource?.value, child.premiumUntil),
              ),
              _Stat(
                icon: 'clock',
                text: child.lastLoginAt == null
                    ? t.neverSignedIn
                    : t.lastSignedIn(
                        MaterialLocalizations.of(
                          context,
                        ).formatMediumDate(child.lastLoginAt!.toLocal()),
                      ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Semantics(header: true, child: Text(t.childSwitches, style: theme.textTheme.headlineSmall)),
        const SizedBox(height: 10),
        SectionCard(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            children: [
              SwitchListTile(
                title: Text(t.consentLeaderboards),
                subtitle: Text(t.consentLeaderboardsBody),
                value: consents.publicLeaderboards,
                onChanged: _busy != null
                    ? null
                    : (on) => _change('leaderboards', () async {
                        final response = await api.getChildrenApi().childrenSetConsents(
                          id: child.id,
                          childConsentsDto: ChildConsentsDto(
                            publicLeaderboards: on,
                            publicPortfolio: consents.publicPortfolio,
                          ),
                        );
                        return response.data!;
                      }),
              ),
              const Divider(height: 1, indent: 16, endIndent: 16),
              SwitchListTile(
                title: Text(t.consentPortfolio),
                subtitle: Text(t.consentPortfolioBody),
                value: consents.publicPortfolio,
                onChanged: _busy != null
                    ? null
                    : (on) => _change('portfolio', () async {
                        final response = await api.getChildrenApi().childrenSetConsents(
                          id: child.id,
                          childConsentsDto: ChildConsentsDto(
                            publicLeaderboards: consents.publicLeaderboards,
                            publicPortfolio: on,
                          ),
                        );
                        return response.data!;
                      }),
              ),
              const Divider(height: 1, indent: 16, endIndent: 16),
              SwitchListTile(
                title: Text(t.streakReminders),
                subtitle: Text(t.streakRemindersBody(child.nickname)),
                value: child.streakReminders,
                onChanged: _busy != null
                    ? null
                    : (on) => _change('reminders', () async {
                        final response = await api.getChildrenApi().childrenUpdate(
                          id: child.id,
                          updateChildDto: UpdateChildDto(streakReminders: on),
                        );
                        return response.data!;
                      }),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SectionCard(
          color: context.kcp.raised,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t.childMoreOnWebsite),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => openExternalLink(context, config.webPage(language, '/dashboard')),
                child: Text(t.openWebsite),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.text});

  final String icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          IconDisc(icon, size: 34),
          const SizedBox(width: 12),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}
