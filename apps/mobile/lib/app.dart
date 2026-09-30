import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth/auth_controller.dart';
import 'config/preferences.dart';
import 'l10n/app_localizations.dart';
import 'push/push_service.dart';
import 'router/deep_links.dart';
import 'router/router.dart';
import 'theme/app_theme.dart';

/// The app: English, Arabic and Urdu (right-to-left), for students and parents.
class KcpApp extends ConsumerWidget {
  const KcpApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final language = ref.watch(appLanguageProvider);

    // Signed in: register the phone for notifications (if allowed already).
    ref.listen(authControllerProvider, (previous, next) {
      if (next is SignedIn && previous is! SignedIn) {
        ref.read(pushServiceProvider).registerIfAllowed();
      }
    });
    ref.listen(appLanguageProvider, (_, _) => ref.read(pushServiceProvider).languageChanged());
    // A tapped notification opens its screen.
    ref.listen(pushRouteProvider, (_, route) {
      if (route == null) return;
      ref.read(pushRouteProvider.notifier).clear();
      router.go(appRouteFor(Uri.parse(route)) ?? '/');
    });

    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context).appName,
      debugShowCheckedModeBanner: false,
      // The phone's light or dark setting decides (there is no switch in the app).
      theme: buildTheme(language),
      darkTheme: buildTheme(language, Brightness.dark),
      themeMode: ThemeMode.system,
      locale: Locale(language),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      scaffoldMessengerKey: scaffoldMessengerKey,
      routerConfig: router,
    );
  }
}
