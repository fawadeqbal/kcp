import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';

/// "Free trial until 14 Oct", "Premium (family plan)"… for a child.
String premiumText(BuildContext context, String? source, DateTime? until) {
  final t = AppLocalizations.of(context);
  final date = until == null
      ? ''
      : MaterialLocalizations.of(context).formatMediumDate(until.toLocal());
  return switch (source) {
    'subscription' => t.premiumPlan,
    'trial' when until != null => t.premiumTrial(date),
    'grant' when until != null => t.premiumUntil(date),
    _ => t.premiumNone,
  };
}
