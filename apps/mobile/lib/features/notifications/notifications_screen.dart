import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../l10n/badge_texts.g.dart';
import '../../theme/app_theme.dart';
import '../../widgets/common.dart';

final notificationsProvider = FutureProvider.autoDispose<NotificationListDto>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getNotificationsApi().notificationsList()).data!;
});

/// Badges, certificates, a child's shipped project, trial and plan news.
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  bool _markedRead = false;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final list = ref.watch(notificationsProvider);
    // Seen now: mark them read (once, quietly).
    if (list case AsyncData(:final value) when value.unread > 0 && !_markedRead) {
      _markedRead = true;
      ref
          .read(apiProvider)
          .getNotificationsApi()
          .notificationsMarkRead(markReadDto: MarkReadDto(all: true))
          .ignore();
    }
    return Scaffold(
      appBar: AppBar(title: Text(t.notificationsTitle)),
      body: switch (list) {
        AsyncData(:final value) when value.items.isEmpty => Center(
          child: Text(t.notificationsEmpty),
        ),
        AsyncData(:final value) => RefreshIndicator(
          onRefresh: () => ref.refresh(notificationsProvider.future),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            itemCount: value.items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final item = value.items[index];
              final p = context.kcp;
              return SectionCard(
                radius: KcpRadius.row,
                color: item.read ? p.surface : p.brand100,
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    IconDisc(
                      'bell',
                      size: 40,
                      background: item.read ? p.sand200 : p.primary,
                      color: item.read ? p.muted : p.onPrimary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            describeNotification(context, ref.watch(appLanguageProvider), item),
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          Text(
                            MaterialLocalizations.of(
                              context,
                            ).formatMediumDate(item.createdAt.toLocal()),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(notificationsProvider),
        ),
        _ => const LoadingView(),
      },
    );
  }
}

String _str(Object? value) => value is String ? value : (value == null ? '' : '$value');

/// A title stored in every language ({"en": "…", "ar": "…"}), in the reader's.
String _titleIn(Object? titles, String language) {
  if (titles is Map) {
    return _str(
      titles[language] ?? titles['en'] ?? (titles.values.isEmpty ? '' : titles.values.first),
    );
  }
  return _str(titles);
}

/// What a notification says, in the app's language.
String describeNotification(BuildContext context, String language, NotificationDto item) {
  final t = AppLocalizations.of(context);
  final d = item.data;
  switch (item.type) {
    case 'badge_earned':
      final key = _str(d['badgeKey']);
      final name = (badgeTexts[language]?[key] ?? badgeTexts['en']?[key])?.name ?? key;
      return t.notificationBadge(name);
    case 'certificate_issued':
      return t.notificationCertificate(_titleIn(d['moduleTitles'], language));
    case 'payment_receipt':
      return t.notificationReceipt(_str(d['number']));
    case 'payment_failed':
      return t.notificationPaymentFailed;
    case 'plan_ended':
      return t.notificationPlanEnded;
    case 'trial_ending':
      final endsAt = DateTime.tryParse(_str(d['endsAt']));
      return t.notificationTrialEnding(
        _str(d['nickname']),
        endsAt == null ? '' : MaterialLocalizations.of(context).formatMediumDate(endsAt.toLocal()),
      );
    case 'child_shipped':
      return t.notificationChildShipped(_str(d['nickname']), _titleIn(d['titles'], language));
    case 'child_certificate':
      return t.notificationChildCertificate(
        _str(d['nickname']),
        _titleIn(d['moduleTitles'], language),
      );
    default:
      return t.notificationOther;
  }
}
