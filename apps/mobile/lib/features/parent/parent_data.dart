import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';

/// The parent's children with their progress.
final childrenProvider = FutureProvider.autoDispose<List<ChildDto>>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getChildrenApi().childrenList()).data!;
});

/// Premium per child and the family plan's status (plans are bought on the website).
final billingProvider = FutureProvider.autoDispose<BillingDto>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getBillingApi().billingOverview()).data!;
});

final emailPreferencesProvider = FutureProvider.autoDispose<EmailPreferencesDto>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getAccountApi().familyEmailsGet()).data!;
});
