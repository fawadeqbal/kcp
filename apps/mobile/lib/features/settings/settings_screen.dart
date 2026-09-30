import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:kcp_api/kcp_api.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../api/api.dart';
import '../../auth/auth_controller.dart';
import '../../config/app_config.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../push/push_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';
import '../../widgets/parental_gate.dart';
import '../parent/parent_data.dart';

final _appVersionProvider = FutureProvider<String>((ref) async {
  final info = await PackageInfo.fromPlatform();
  return '${info.version} (${info.buildNumber})';
});

/// Language, notifications, feedback, the legal pages, and logging out.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final auth = ref.watch(authControllerProvider);
    final isParent = auth is SignedIn && auth.isParent;
    final choice = ref.watch(languageChoiceProvider);
    final language = ref.watch(appLanguageProvider);
    final config = ref.watch(appConfigProvider);
    final push = ref.watch(pushServiceProvider);
    final version = ref.watch(_appVersionProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t.settingsTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          _Header(t.settingsLanguage),
          _Group(
            child: RadioGroup<String>(
              groupValue: choice ?? 'system',
              onChanged: (value) =>
                  ref.read(languageChoiceProvider.notifier).set(value == 'system' ? null : value),
              child: Column(
                children: [
                  RadioListTile(value: 'system', title: Text(t.languageSystem)),
                  const RadioListTile(value: 'en', title: Text('English')),
                  const RadioListTile(value: 'ar', title: Text('العربية')),
                  const RadioListTile(value: 'ur', title: Text('اردو')),
                ],
              ),
            ),
          ),
          _Header(t.settingsNotifications),
          _Group(
            child: Column(
              children: [
                if (!push.available)
                  ListTile(leading: const KcpIcon('bellOff'), title: Text(t.pushUnavailable))
                else
                  ListTile(
                    leading: const KcpIcon('bell'),
                    title: Text(t.pushTurnOn),
                    subtitle: Text(isParent ? t.pushParentBody : t.pushStudentBody),
                    onTap: () async {
                      final allowed = await ref
                          .read(pushServiceProvider)
                          .requestPermissionAndRegister();
                      if (context.mounted) {
                        ScaffoldMessenger.of(
                          context,
                        ).showSnackBar(SnackBar(content: Text(allowed ? t.pushOn : t.pushBlocked)));
                      }
                    },
                  ),
                if (isParent) const _MonthlySummarySwitch(),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Group(
            child: Column(
              children: [
                ListTile(
                  leading: const KcpIcon('msg'),
                  title: Text(t.feedbackTitle),
                  trailing: const KcpIcon('chevR', size: 18),
                  onTap: () => context.push('/feedback'),
                ),
                ListTile(
                  leading: const KcpIcon('shield'),
                  title: Text(t.privacyPolicy),
                  trailing: const KcpIcon('external', size: 18),
                  onTap: () => openExternalLink(context, config.webPage(language, '/privacy')),
                ),
                ListTile(
                  leading: const KcpIcon('file'),
                  title: Text(t.termsOfUse),
                  trailing: const KcpIcon('external', size: 18),
                  onTap: () => openExternalLink(context, config.webPage(language, '/terms')),
                ),
                if (isParent)
                  ListTile(
                    leading: const KcpIcon('user'),
                    title: Text(t.accountOnWebsite),
                    subtitle: Text(t.accountOnWebsiteBody),
                    trailing: const KcpIcon('external', size: 18),
                    onTap: () => openExternalLink(context, config.webPage(language, '/account')),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Group(
            child: ListTile(
              leading: KcpIcon('logout', color: context.kcp.danger),
              title: Text(t.logOut, style: TextStyle(color: context.kcp.danger)),
              onTap: () => ref.read(authControllerProvider.notifier).logout(),
            ),
          ),
          if (version case AsyncData(:final value))
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(t.appVersion(value), style: Theme.of(context).textTheme.bodySmall),
            ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(4, 16, 4, 8),
      child: Semantics(header: true, child: Kicker(text)),
    );
  }
}

/// A rounded panel around a few settings.
class _Group extends StatelessWidget {
  const _Group({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SectionCard(padding: const EdgeInsets.symmetric(vertical: 6), child: child);
  }
}

/// The monthly progress email (parents), behind the parental gate.
class _MonthlySummarySwitch extends ConsumerStatefulWidget {
  const _MonthlySummarySwitch();

  @override
  ConsumerState<_MonthlySummarySwitch> createState() => _MonthlySummarySwitchState();
}

class _MonthlySummarySwitchState extends ConsumerState<_MonthlySummarySwitch> {
  bool? _value;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final prefs = ref.watch(emailPreferencesProvider);
    final value = _value ?? prefs.value?.monthlySummary;
    return SwitchListTile(
      secondary: const KcpIcon('mail'),
      title: Text(t.monthlySummary),
      subtitle: Text(t.monthlySummaryBody),
      value: value ?? false,
      onChanged: value == null || _busy
          ? null
          : (on) async {
              if (!await passParentalGate(context)) return;
              setState(() => _busy = true);
              try {
                final api = ref.read(apiProvider);
                final response = await api.getAccountApi().familyEmailsUpdate(
                  emailPreferencesDto: EmailPreferencesDto(monthlySummary: on),
                );
                if (mounted) setState(() => _value = response.data?.monthlySummary ?? on);
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text(t.errorGeneric)));
                }
              } finally {
                if (mounted) setState(() => _busy = false);
              }
            },
    );
  }
}
