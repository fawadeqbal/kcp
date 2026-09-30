import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../api/api.dart';
import '../auth/auth_controller.dart';
import '../config/app_config.dart';
import '../config/preferences.dart';
import '../l10n/app_localizations.dart';

/// Shows messages from anywhere (a notification that arrives while the app is open).
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// Where a tapped notification goes (the router listens to it).
final pushRouteProvider = NotifierProvider<PushRoute, String?>(PushRoute.new);

class PushRoute extends Notifier<String?> {
  @override
  String? build() => null;

  void open(String route) => state = route;
  void clear() => state = null;
}

/// Push notifications through Firebase Cloud Messaging: streak reminders for
/// students, trial and monthly news for parents. Off until Firebase is configured
/// (`config/<flavour>.json`): the app works without it. The phone's token goes to our
/// API only while someone is signed in, and is removed at logout.
class PushService {
  PushService(this.ref, this.config) {
    ref.read(authControllerProvider.notifier).onBeforeLogout(unregister);
  }

  final Ref ref;
  final AppConfig config;
  bool _ready = false;
  String? _registeredToken;
  String? _registeredLanguage;
  final List<StreamSubscription<Object?>> _subscriptions = [];

  /// Firebase is configured for this build.
  bool get available =>
      config.firebase != null && !kIsWeb && (Platform.isAndroid || Platform.isIOS);

  static const _optInKey = 'kcp.pushOptIn';

  /// Someone on this phone turned notifications on in the app. Until then the app
  /// never asks Firebase for a token (also on Android versions that allow
  /// notifications without asking).
  bool get optedIn => ref.read(sharedPreferencesProvider).getBool(_optInKey) ?? false;

  FirebaseMessaging get _messaging => FirebaseMessaging.instance;

  Future<bool> _init() async {
    if (_ready) return true;
    final firebase = config.firebase;
    if (!available || firebase == null) return false;
    try {
      await Firebase.initializeApp(
        options: FirebaseOptions(
          apiKey: firebase.apiKey,
          appId: Platform.isIOS ? firebase.iosAppId : firebase.androidAppId,
          messagingSenderId: firebase.senderId,
          projectId: firebase.projectId,
        ),
      );
      _subscriptions
        ..add(FirebaseMessaging.onMessage.listen(_onForeground))
        ..add(FirebaseMessaging.onMessageOpenedApp.listen(_onOpened))
        ..add(_messaging.onTokenRefresh.listen((token) => _register(token)));
      final initial = await _messaging.getInitialMessage();
      if (initial != null) _onOpened(initial);
      _ready = true;
    } catch (error) {
      debugPrint('Push notifications are off: $error');
    }
    return _ready;
  }

  /// After signing in: registers the phone if notifications were turned on in the
  /// app and are allowed by the phone (never asks by itself).
  Future<void> registerIfAllowed() async {
    if (!optedIn || !await _init()) return;
    try {
      final settings = await _messaging.getNotificationSettings();
      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        await _messaging.setAutoInitEnabled(true);
        final token = await _messaging.getToken();
        if (token != null) await _register(token);
      }
    } catch (error) {
      debugPrint('Push registration failed: $error');
    }
  }

  /// Asks the phone for permission (from the settings, or a reminder card), then
  /// registers. Returns whether notifications are allowed.
  Future<bool> requestPermissionAndRegister() async {
    if (!await _init()) return false;
    await ref.read(sharedPreferencesProvider).setBool(_optInKey, true);
    final settings = await _messaging.requestPermission();
    final allowed =
        settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
    if (allowed) await registerIfAllowed();
    return allowed;
  }

  /// The app's language changed: notifications follow it.
  Future<void> languageChanged() async {
    final token = _registeredToken;
    if (token != null && _registeredLanguage != ref.read(appLanguageProvider)) {
      await _register(token);
    }
  }

  Future<void> _register(String token) async {
    if (ref.read(authControllerProvider) is! SignedIn) return;
    final language = ref.read(appLanguageProvider);
    await ref
        .read(apiProvider)
        .getDevicesApi()
        .devicesRegister(
          registerDeviceDto: RegisterDeviceDto(
            token: token,
            platform: Platform.isIOS
                ? RegisterDeviceDtoPlatformEnum.ios
                : RegisterDeviceDtoPlatformEnum.android,
            language: RegisterDeviceDtoLanguageEnum.values.firstWhere(
              (value) => value.value == language,
              orElse: () => RegisterDeviceDtoLanguageEnum.en,
            ),
          ),
        );
    _registeredToken = token;
    _registeredLanguage = language;
  }

  /// Before logging out: this phone gets nothing more for that account.
  Future<void> unregister() async {
    final token = _registeredToken;
    if (token == null) return;
    _registeredToken = null;
    try {
      await ref
          .read(publicApiProvider)
          .getDevicesApi()
          .devicesRemove(removeDeviceDto: RemoveDeviceDto(token: token));
    } finally {
      // A new token next time, whatever happened: the old one can't reach this phone.
      if (_ready) await _messaging.deleteToken();
    }
  }

  void _onForeground(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;
    final route = message.data['route'];
    scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Text(notification.title ?? notification.body ?? ''),
        action: route is String && route.startsWith('/')
            ? SnackBarAction(
                label: lookupAppLocalizations(
                  Locale(ref.read(appLanguageProvider)),
                ).notificationOpen,
                onPressed: () => ref.read(pushRouteProvider.notifier).open(route),
              )
            : null,
      ),
    );
  }

  void _onOpened(RemoteMessage message) {
    final route = message.data['route'];
    if (route is String && route.startsWith('/')) {
      ref.read(pushRouteProvider.notifier).open(route);
    }
  }

  void dispose() {
    for (final subscription in _subscriptions) {
      subscription.cancel();
    }
  }
}

final pushServiceProvider = Provider<PushService>((ref) {
  final service = PushService(ref, ref.watch(appConfigProvider));
  ref.onDispose(service.dispose);
  return service;
});
