import 'package:flutter/material.dart';

import '../api/api_error.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import 'kcp_icon.dart';

export 'kcp_icon.dart';

/// The text for an API error, in the app's language.
String errorText(AppLocalizations t, Object error) {
  final apiError = ApiError.from(error);
  if (apiError.offline) return t.errorOffline;
  switch (apiError.code) {
    case 'INVALID_CREDENTIALS':
      return t.errorInvalidCredentials;
    case 'NOT_FAMILY':
      return t.errorNotFamily;
    case 'ACCOUNT_SUSPENDED':
    case 'ACCOUNT_DISABLED':
      return t.errorSuspended;
    case 'EMAIL_NOT_VERIFIED':
      return t.errorEmailNotVerified;
    case 'PREMIUM_REQUIRED':
      return t.errorPremium;
    case 'CONSENT_PENDING':
      return t.errorConsentPending;
    case 'PICTURE_LOCKED':
      return t.errorPictureLocked;
    case 'PAIRING_NOT_FOUND':
      return t.errorPairingNotFound;
    case 'FRIEND_CODE_NOT_FOUND':
      return t.errorFriendCodeNotFound;
    case 'FRIEND_SELF':
      return t.errorFriendSelf;
    case 'ALREADY_FRIENDS':
      return t.errorAlreadyFriends;
    case 'FRIEND_REQUEST_EXISTS':
      return t.errorFriendRequestExists;
    case 'TOO_MANY_FRIEND_REQUESTS':
      return t.errorTooManyFriendRequests;
    case 'TOO_MANY_FRIENDS':
      return t.errorTooManyFriends;
    case 'FRIEND_REQUEST_CLOSED':
      return t.errorFriendRequestClosed;
    case 'PHRASES_ONLY':
      return t.errorPhrasesOnly;
    case 'CHAT_MUTED':
      return t.errorChatMuted;
    case 'EVENT_CLOSED':
      return t.errorEventClosed;
    case 'TEAM_FULL':
      return t.errorTeamFull;
    case 'ALREADY_IN_TEAM':
      return t.errorChildInTeam;
    case 'CLASS_FULL':
      return t.errorClassFull;
    case 'REQUEST_NOT_FOUND':
      return t.errorRequestAnswered;
    case 'TOO_MANY_MESSAGES':
      return t.errorTooManyMessages;
    case 'ROOM_ARCHIVED':
      return t.errorRoomArchived;
    case 'REPORT_SELF':
      return t.errorReportSelf;
    case 'MESSAGE_BLOCKED':
      return switch (apiError.details?['reason']) {
        'LINK' => t.roomBlockedLink,
        'EMAIL' => t.roomBlockedEmail,
        'PHONE' => t.roomBlockedPhone,
        'CONTACT' => t.roomBlockedContact,
        _ => t.roomBlockedWords,
      };
  }
  if (apiError.isTooManyRequests) return t.errorTooMany;
  return t.errorGeneric;
}

/// A rounded sand panel with padding: most blocks on a screen. Tappable with [onTap].
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.child,
    this.color,
    this.padding,
    this.radius,
    this.onTap,
    this.border,
  });

  final Widget child;
  final Color? color;
  final EdgeInsetsGeometry? padding;
  final double? radius;
  final VoidCallback? onTap;
  final BorderSide? border;

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius ?? KcpRadius.inner),
      side: border ?? BorderSide.none,
    );
    return Material(
      color: color ?? context.kcp.surface,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding ?? const EdgeInsets.all(18), child: child),
      ),
    );
  }
}

/// An icon on a round, tinted disc (rows of the home screen, the parent's lists).
class IconDisc extends StatelessWidget {
  const IconDisc(this.icon, {super.key, this.size = 42, this.background, this.color});

  final String icon;
  final double size;
  final Color? background;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.kcp;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: background ?? p.brand100, shape: BoxShape.circle),
      child: KcpIcon(icon, size: size * 0.45, color: color ?? p.brandText),
    );
  }
}

/// A small rounded label: the streak, XP won, "Done".
class KcpPill extends StatelessWidget {
  const KcpPill({
    super.key,
    required this.label,
    this.icon,
    this.background,
    this.color,
    this.semanticLabel,
  });

  final String label;
  final String? icon;
  final Color? background;
  final Color? color;

  /// What a screen reader says instead of [label] (e.g. "Streak: 5" for "5").
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.kcp;
    final foreground = color ?? p.brand800;
    final pill = Container(
      padding: EdgeInsets.fromLTRB(icon == null ? 12 : 10, 6, 12, 6),
      decoration: BoxDecoration(
        color: background ?? p.brand100,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            KcpIcon(icon!, size: 15, color: foreground),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.labelMedium?.copyWith(color: foreground, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
    if (semanticLabel == null) return pill;
    return Semantics(
      container: true,
      label: semanticLabel,
      child: ExcludeSemantics(child: pill),
    );
  }
}

/// The small uppercase line above a title ("PICK UP WHERE YOU LEFT OFF").
class Kicker extends StatelessWidget {
  const Kicker(this.text, {super.key, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    // Spacing letters apart would break the joins of Arabic and Urdu script.
    final latin = Localizations.localeOf(context).languageCode == 'en';
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
        color: color ?? context.kcp.brandText,
        fontWeight: FontWeight.w800,
        letterSpacing: latin ? 1.1 : 0,
      ),
    );
  }
}

/// A rounded progress bar. [fraction] is 0 to 1.
class KcpMeter extends StatelessWidget {
  const KcpMeter({super.key, required this.fraction, this.color, this.track, this.height = 10});

  final double fraction;
  final Color? color;
  final Color? track;
  final double height;

  @override
  Widget build(BuildContext context) {
    final p = context.kcp;
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        value: fraction.clamp(0.0, 1.0),
        minHeight: height,
        backgroundColor: track ?? p.track,
        color: color ?? p.sage600,
      ),
    );
  }
}

/// A row that leads somewhere: an icon disc, a title, a line of detail, a chevron.
class RowCard extends StatelessWidget {
  const RowCard({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
    this.color,
    this.iconBackground,
    this.iconColor,
    this.leading,
  });

  final String icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final Color? color;
  final Color? iconBackground;
  final Color? iconColor;

  /// Instead of the icon disc (an avatar).
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final p = context.kcp;
    return SectionCard(
      color: color,
      radius: KcpRadius.row,
      padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
      onTap: onTap,
      child: Row(
        children: [
          leading ?? IconDisc(icon, background: iconBackground, color: iconColor),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleSmall?.copyWith(fontSize: 15)),
                if (subtitle != null) Text(subtitle!, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          if (onTap != null) KcpIcon('chevR', size: 18, color: p.muted),
        ],
      ),
    );
  }
}

/// Loading, with a label for screen readers.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.label});

  /// Shown under the spinner (e.g. "Getting the blocks ready…").
  final String? label;

  @override
  Widget build(BuildContext context) {
    final spinner = Semantics(
      label: label ?? AppLocalizations.of(context).loading,
      child: const CircularProgressIndicator(strokeCap: StrokeCap.round),
    );
    if (label == null) return Center(child: spinner);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          spinner,
          const SizedBox(height: 14),
          ExcludeSemantics(child: Text(label!, textAlign: TextAlign.center)),
        ],
      ),
    );
  }
}

/// Something failed: what happened, and a way to try again.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final p = context.kcp;
    final offline = ApiError.from(error).offline;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconDisc(
              offline ? 'wifiOff' : 'alert',
              size: 64,
              background: p.sand200,
              color: p.muted,
            ),
            const SizedBox(height: 14),
            Text(
              errorText(t, error),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: Text(t.tryAgain)),
          ],
        ),
      ),
    );
  }
}

/// Code is always left-to-right and monospace, also in Arabic and Urdu.
class CodeText extends StatelessWidget {
  const CodeText(this.code, {super.key, this.style, this.highlight = false});

  final String code;
  final TextStyle? style;

  /// Colour strings, tags and comments like the web's code editor.
  final bool highlight;

  static const _fonts = ['Menlo', 'Courier New', 'monospace'];

  @override
  Widget build(BuildContext context) {
    final base = (style ?? const TextStyle()).copyWith(
      fontFamily: 'monospace',
      fontFamilyFallback: _fonts,
      fontSize: style?.fontSize ?? 15,
      height: 1.5,
      fontVariations: const [],
    );
    return Directionality(
      textDirection: TextDirection.ltr,
      child: highlight
          ? Text.rich(
              TextSpan(style: base, children: highlightCode(code, context.kcp)),
              textAlign: TextAlign.left,
            )
          : Text(code, textAlign: TextAlign.left, style: base),
    );
  }
}

final _codeToken = RegExp(
  r'''(<!--[\s\S]*?-->|(?<=^|[ \t])#(?![0-9a-fA-F]{3,8}\b)[^\n]*|//[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(</?[a-zA-Z][\w-]*|/?>)''',
  multiLine: true,
);

/// Strings, HTML tags and comments in the code colours of the design system.
List<TextSpan> highlightCode(String code, KcpPalette p) {
  final spans = <TextSpan>[];
  var at = 0;
  for (final match in _codeToken.allMatches(code)) {
    if (match.start > at) spans.add(TextSpan(text: code.substring(at, match.start)));
    final color = match[1] != null
        ? p.codeCom
        : match[2] != null
        ? p.codeStr
        : p.codeTag;
    spans.add(
      TextSpan(
        text: match[0],
        style: TextStyle(
          color: color,
          fontStyle: match[1] != null ? FontStyle.italic : FontStyle.normal,
        ),
      ),
    );
    at = match.end;
  }
  if (at < code.length) spans.add(TextSpan(text: code.substring(at)));
  return spans;
}

/// A well of code (a quiz's program), in the editor's colours.
class CodeBlock extends StatelessWidget {
  const CodeBlock(this.lines, {super.key});

  final List<String> lines;

  @override
  Widget build(BuildContext context) {
    final p = context.kcp;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: p.codeBg,
        borderRadius: BorderRadius.circular(KcpRadius.well),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: CodeText(lines.join('\n'), style: TextStyle(color: p.ink), highlight: true),
      ),
    );
  }
}

/// The product mark: a terracotta circle with the code brackets.
class LogoMark extends StatelessWidget {
  const LogoMark({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.kcp;
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: p.brand, shape: BoxShape.circle),
        child: KcpIcon('code', size: size * 0.5, color: p.onPrimary),
      ),
    );
  }
}
