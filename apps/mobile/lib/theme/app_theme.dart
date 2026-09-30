import 'package:flutter/material.dart';

import '../widgets/kcp_icon.dart';
import 'tokens.g.dart';

export 'tokens.g.dart';

/// The Organic system's colours for the current light or dark theme.
extension KcpThemeContext on BuildContext {
  KcpPalette get kcp => Theme.of(this).extension<KcpPalette>() ?? kcpLight;
}

/*
 * Type: Caprasimo headings over Figtree text, as on the web. Arabic letters use Noto
 * Sans Arabic, with rounded Baloo Bhaijaan 2 for headings; Urdu uses Nastaliq
 * throughout (tall: it gets more room between lines). Latin letters (nicknames, code
 * words) keep Figtree and Caprasimo in every language.
 */
const _display = 'Caprasimo';
const _body = 'Figtree';

List<String> _displayFallback(String language) => switch (language) {
  'ar' => const ['BalooBhaijaan2', 'NotoSansArabic', _body],
  'ur' => const ['NotoNastaliqUrdu', _body],
  _ => const [_body],
};

List<String> _bodyFallback(String language) => switch (language) {
  'ar' => const ['NotoSansArabic'],
  'ur' => const ['NotoNastaliqUrdu', 'NotoSansArabic'],
  _ => const ['NotoSansArabic'],
};

/// Headings in the display face. Caprasimo has one weight; Arabic and Urdu headings
/// use their fonts' real bold (Nastaliq is a variable font: its weight is an axis).
TextStyle kcpDisplay(String language, {double size = 22, Color? color}) {
  final ur = language == 'ur';
  return TextStyle(
    fontFamily: _display,
    fontFamilyFallback: _displayFallback(language),
    fontSize: size,
    fontWeight: language == 'ar' ? FontWeight.w700 : FontWeight.w400,
    fontVariations: ur ? const [FontVariation('wght', 700)] : null,
    height: ur ? 1.8 : 1.15,
    letterSpacing: language == 'en' ? -0.015 * size : 0,
    color: color,
  );
}

TextTheme _textTheme(String language, KcpPalette p) {
  final ur = language == 'ur';
  TextStyle body(double size, FontWeight weight, double height, {Color? color}) => TextStyle(
    fontFamily: _body,
    fontFamilyFallback: _bodyFallback(language),
    fontSize: size,
    fontWeight: weight,
    fontVariations: ur && weight.value >= 600
        ? [FontVariation('wght', weight.value.toDouble())]
        : null,
    height: ur ? 2.0 : height,
    color: color ?? p.ink,
  );
  TextStyle display(double size) => kcpDisplay(language, size: size, color: p.ink);
  return TextTheme(
    displayLarge: display(48),
    displayMedium: display(40),
    displaySmall: display(34),
    headlineLarge: display(30),
    headlineMedium: display(26),
    headlineSmall: display(22),
    titleLarge: display(20),
    titleMedium: body(16, FontWeight.w700, 1.35),
    titleSmall: body(14, FontWeight.w700, 1.35),
    bodyLarge: body(16, FontWeight.w400, 1.5),
    bodyMedium: body(15, FontWeight.w400, 1.45),
    bodySmall: body(13, FontWeight.w400, 1.4, color: p.muted),
    labelLarge: body(15, FontWeight.w700, 1.3),
    labelMedium: body(13, FontWeight.w600, 1.3),
    labelSmall: body(12, FontWeight.w600, 1.3),
  );
}

ColorScheme _scheme(KcpPalette p, Brightness brightness) => ColorScheme(
  brightness: brightness,
  primary: p.primary,
  onPrimary: p.onPrimary,
  primaryContainer: p.brand100,
  onPrimaryContainer: p.brand800,
  secondary: p.sage700,
  onSecondary: p.sage100,
  secondaryContainer: p.sage100,
  onSecondaryContainer: p.sage800,
  tertiary: p.brand,
  onTertiary: p.onPrimary,
  error: p.danger,
  onError: p.onDanger,
  errorContainer: p.dangerSoft,
  onErrorContainer: p.dangerText,
  surface: p.canvas,
  onSurface: p.ink,
  onSurfaceVariant: p.muted,
  surfaceContainerLowest: p.raised,
  surfaceContainerLow: p.surface,
  surfaceContainer: p.surface,
  surfaceContainerHigh: p.surface,
  surfaceContainerHighest: p.sand200,
  outline: p.muted,
  outlineVariant: p.line,
  shadow: const Color(0xFF000000),
  scrim: const Color(0xFF000000),
  inverseSurface: p.ink,
  onInverseSurface: p.canvas,
  inversePrimary: p.brand300,
  surfaceTint: Colors.transparent,
);

/// The app's look, from the shared design tokens, for the phone's light or dark mode.
ThemeData buildTheme(String language, [Brightness brightness = Brightness.light]) {
  final p = brightness == Brightness.dark ? kcpDark : kcpLight;
  final scheme = _scheme(p, brightness);
  final text = _textTheme(language, p);
  final pill = const StadiumBorder();
  final buttonText = kcpDisplay(language, size: 16);
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    extensions: [p],
    textTheme: text,
    fontFamily: _body,
    scaffoldBackgroundColor: p.canvas,
    canvasColor: p.canvas,
    dividerColor: p.line,
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    splashFactory: InkSparkle.splashFactory,
    iconTheme: IconThemeData(color: p.ink, size: 22),
    // Back and close in the app bar: the same round icons as everywhere else.
    actionIconTheme: ActionIconThemeData(
      backButtonIconBuilder: (_) => const KcpIcon('chevL', size: 24),
      closeButtonIconBuilder: (_) => const KcpIcon('x', size: 22),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: p.canvas,
      foregroundColor: p.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: kcpDisplay(language, size: 22, color: p.ink),
      iconTheme: IconThemeData(color: p.ink, size: 22),
    ),
    cardTheme: CardThemeData(
      color: p.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KcpRadius.inner)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        // At least 52 high already: no extra invisible margin around the pill.
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        backgroundColor: p.primary,
        foregroundColor: p.onPrimary,
        disabledBackgroundColor: p.track,
        disabledForegroundColor: p.muted,
        minimumSize: const Size(64, 52),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        textStyle: buttonText,
        shape: pill,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        // At least 52 high already: no extra invisible margin around the pill.
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        backgroundColor: p.canvas,
        foregroundColor: p.ink,
        elevation: 0,
        minimumSize: const Size(64, 48),
        textStyle: buttonText,
        shape: pill,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        // At least 52 high already: no extra invisible margin around the pill.
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        foregroundColor: p.ink,
        minimumSize: const Size(64, 52),
        padding: const EdgeInsets.symmetric(horizontal: 22),
        side: BorderSide(color: p.line),
        textStyle: buttonText,
        shape: pill,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: p.brandText,
        minimumSize: const Size(48, 48),
        textStyle: buttonText.copyWith(fontSize: 15),
        shape: pill,
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(foregroundColor: p.ink, minimumSize: const Size(48, 48)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.raised,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      labelStyle: text.bodyMedium?.copyWith(color: p.muted),
      floatingLabelStyle: text.bodyMedium?.copyWith(color: p.ink, fontWeight: FontWeight.w600),
      hintStyle: text.bodyMedium?.copyWith(color: p.muted),
      helperStyle: text.bodySmall,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: BorderSide(color: p.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: BorderSide(color: p.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: BorderSide(color: p.brand, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: BorderSide(color: p.danger),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: BorderSide(color: p.danger, width: 2),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: p.surface,
      surfaceTintColor: Colors.transparent,
      indicatorColor: p.brand100,
      indicatorShape: pill,
      height: 72,
      elevation: 0,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => text.labelSmall?.copyWith(
          color: states.contains(WidgetState.selected) ? p.ink : p.muted,
          fontWeight: states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w600,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          size: 22,
          color: states.contains(WidgetState.selected) ? p.brandText : p.muted,
        ),
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: const WidgetStatePropertyAll(Colors.white),
      trackColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? p.sage600 : p.sand400,
      ),
      trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? p.primary : Colors.transparent,
      ),
      checkColor: WidgetStatePropertyAll(p.onPrimary),
      side: BorderSide(color: p.muted, width: 1.5),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
    ),
    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected) ? p.primary : p.muted,
      ),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: p.primary,
      linearTrackColor: p.track,
      circularTrackColor: Colors.transparent,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: p.raised,
      selectedColor: p.brand100,
      side: BorderSide.none,
      shape: pill,
      labelStyle: text.labelMedium,
    ),
    listTileTheme: ListTileThemeData(
      iconColor: p.muted,
      titleTextStyle: text.titleMedium,
      subtitleTextStyle: text.bodySmall,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KcpRadius.row)),
    ),
    dividerTheme: DividerThemeData(color: p.line, thickness: 1, space: 1),
    dialogTheme: DialogThemeData(
      backgroundColor: p.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KcpRadius.panel)),
      titleTextStyle: kcpDisplay(language, size: 22, color: p.ink),
      contentTextStyle: text.bodyMedium,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: p.surface,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
      dragHandleColor: p.sand400,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(KcpRadius.panel)),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: p.ink,
      unselectedLabelColor: p.muted,
      labelStyle: text.labelLarge,
      unselectedLabelStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      dividerColor: Colors.transparent,
      indicatorSize: TabBarIndicatorSize.tab,
      indicator: ShapeDecoration(shape: pill, color: p.canvas),
      overlayColor: const WidgetStatePropertyAll(Colors.transparent),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: SegmentedButton.styleFrom(
        backgroundColor: p.surface,
        selectedBackgroundColor: p.canvas,
        foregroundColor: p.muted,
        selectedForegroundColor: p.ink,
        side: BorderSide(color: p.line),
        textStyle: text.labelLarge,
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: p.ink,
      contentTextStyle: text.bodyMedium?.copyWith(color: p.canvas),
      actionTextColor: p.brand300,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(KcpRadius.row)),
    ),
    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(color: p.ink, borderRadius: BorderRadius.circular(12)),
      textStyle: text.bodySmall?.copyWith(color: p.canvas),
    ),
    pageTransitionsTheme: const PageTransitionsTheme(),
  );
}
