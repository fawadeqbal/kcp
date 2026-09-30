import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/auth_controller.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

/// The first screen: who is using the app, and in which language. Accounts are
/// made on the website by a parent; the app only signs in.
class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider);
    final language = ref.watch(appLanguageProvider);
    final p = context.kcp;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: _LanguageMenu(current: language),
            ),
            const SizedBox(height: 8),
            // The picture: a sage panel with two soft circles, the mark and the promise.
            Container(
              constraints: const BoxConstraints(minHeight: 300),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: p.sage200,
                borderRadius: BorderRadius.circular(KcpRadius.card),
              ),
              child: Stack(
                children: [
                  PositionedDirectional(
                    end: -40,
                    bottom: -70,
                    child: _Circle(size: 230, color: p.sage300),
                  ),
                  PositionedDirectional(
                    end: 60,
                    bottom: 60,
                    child: _Circle(size: 90, color: p.brand300),
                  ),
                  PositionedDirectional(end: 36, top: 36, child: _Circle(size: 46, color: p.brand)),
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const LogoMark(size: 38),
                            const SizedBox(width: 10),
                            Flexible(
                              child: Text(
                                t.appName,
                                style: theme.textTheme.titleLarge?.copyWith(color: p.sage900),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 110),
                        Semantics(
                          header: true,
                          child: Text(
                            t.welcomeTitle,
                            style: theme.textTheme.displaySmall?.copyWith(color: p.sage900),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(t.welcomeBody, style: theme.textTheme.bodyLarge),
            ),
            const SizedBox(height: 16),
            if (auth is SignedOut && auth.expired)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: SectionCard(
                  color: p.warnSoft,
                  radius: KcpRadius.row,
                  child: Text(t.sessionExpired, style: TextStyle(color: p.warnText)),
                ),
              ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () => context.push('/login/student'),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const KcpIcon('graduation', size: 20),
                  const SizedBox(width: 10),
                  Flexible(child: Text(t.welcomeStudent)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => context.push('/login/parent'),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const KcpIcon('users', size: 20),
                  const SizedBox(width: 10),
                  Flexible(child: Text(t.welcomeParent)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text(t.welcomeNoAccount, textAlign: TextAlign.center, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

class _Circle extends StatelessWidget {
  const _Circle({required this.size, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}

class _LanguageMenu extends ConsumerWidget {
  const _LanguageMenu({required this.current});

  final String current;

  static const names = {'en': 'English', 'ar': 'العربية', 'ur': 'اردو'};

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    return PopupMenuButton<String>(
      tooltip: t.settingsLanguage,
      onSelected: (language) => ref.read(languageChoiceProvider.notifier).set(language),
      itemBuilder: (_) => [
        for (final entry in names.entries)
          PopupMenuItem(value: entry.key, child: Text(entry.value)),
      ],
      child: Container(
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          border: Border.all(color: context.kcp.line),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const KcpIcon('globe', size: 18),
            const SizedBox(width: 6),
            Text(names[current] ?? current, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(width: 4),
            KcpIcon('chevD', size: 14, color: context.kcp.muted),
          ],
        ),
      ),
    );
  }
}
