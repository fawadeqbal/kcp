import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../auth/auth_controller.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../l10n/badge_texts.g.dart';
import '../../theme/app_theme.dart';
import '../../widgets/avatar.dart';
import '../../widgets/common.dart';
import 'progress_widgets.dart';
import 'student_data.dart';

/// The student: their badges, and the settings.
class MeScreen extends ConsumerWidget {
  const MeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final auth = ref.watch(authControllerProvider);
    final badges = ref.watch(badgesProvider);
    final progress = ref.watch(progressProvider);
    final language = ref.watch(appLanguageProvider);
    final me = auth is SignedIn ? auth.me : null;
    return Scaffold(
      appBar: AppBar(
        title: Text(t.tabMe),
        actions: [
          IconButton(
            tooltip: t.settingsTitle,
            style: IconButton.styleFrom(backgroundColor: context.kcp.surface),
            icon: const KcpIcon('settings', size: 20),
            onPressed: () => context.push('/settings'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          if (me != null)
            Row(
              children: [
                KcpAvatar(me.student?.avatarKey ?? 'rocket', size: 64),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        me.student?.nickname ?? '',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      if (me.username != null)
                        Directionality(
                          textDirection: TextDirection.ltr,
                          child: Text(me.username!, style: Theme.of(context).textTheme.bodySmall),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          if (progress case AsyncData(:final value)) ...[
            const SizedBox(height: 18),
            XpBar(progress: value),
          ],
          const SizedBox(height: 24),
          Semantics(
            header: true,
            child: Text(t.badgesTitle, style: Theme.of(context).textTheme.headlineSmall),
          ),
          const SizedBox(height: 12),
          switch (badges) {
            AsyncData(:final value) => _BadgeGrid(badges: value.badges, language: language),
            AsyncError(:final error) => ErrorView(
              error: error,
              onRetry: () => ref.invalidate(badgesProvider),
            ),
            _ => const SizedBox(height: 120, child: LoadingView()),
          },
        ],
      ),
    );
  }
}

class _BadgeGrid extends StatelessWidget {
  const _BadgeGrid({required this.badges, required this.language});

  final List<BadgeDto> badges;
  final String language;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final sorted = [...badges]..sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0));
    final earned = badges.where((badge) => badge.earned).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(t.badgesEarned(earned, badges.length), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) => Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final badge in sorted)
                SizedBox(
                  width: (constraints.maxWidth - 10) / 2,
                  child: SectionCard(
                    color: badge.earned ? context.kcp.brand100 : context.kcp.surface,
                    radius: KcpRadius.row,
                    padding: const EdgeInsets.all(12),
                    child: MergeSemantics(
                      child: Column(
                        children: [
                          Opacity(
                            opacity: badge.earned ? 1 : 0.35,
                            child: ExcludeSemantics(
                              child: Text(badge.icon, style: const TextStyle(fontSize: 36)),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _text(badge.key).name,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            badge.earned ? _text(badge.key).description : t.badgeLocked,
                            textAlign: TextAlign.center,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  BadgeText _text(String key) =>
      badgeTexts[language]?[key] ?? badgeTexts['en']?[key] ?? (name: key, description: '');
}
