import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/auth_controller.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/common.dart';

/// While the saved session is picked up; or when the API can't be reached.
class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final offline = ref.watch(authControllerProvider) is AuthOffline;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const LogoMark(size: 72),
              const SizedBox(height: 18),
              Text(t.appName, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 24),
              if (offline) ...[
                Text(t.errorOffline, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.read(authControllerProvider.notifier).restore(),
                  child: Text(t.tryAgain),
                ),
              ] else
                Semantics(label: t.loading, child: const CircularProgressIndicator()),
            ],
          ),
        ),
      ),
    );
  }
}
