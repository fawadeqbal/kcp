import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../api/api.dart';
import '../api/api_error.dart';
import '../config/preferences.dart';
import 'token_store.dart';

/// Who is using the app.
sealed class AuthState {
  const AuthState();
}

/// Looking for a saved session (the splash screen).
class AuthRestoring extends AuthState {
  const AuthRestoring();
}

/// A session was saved but the API can't be reached: try again.
class AuthOffline extends AuthState {
  const AuthOffline();
}

class SignedOut extends AuthState {
  const SignedOut({this.expired = false});

  /// The session ended on its own (logged out elsewhere, or too old).
  final bool expired;
}

class SignedIn extends AuthState {
  const SignedIn(this.me);

  final MeDto me;

  bool get isStudent => me.kind == MeDtoKindEnum.STUDENT;
  bool get isParent => me.role.key == 'parent';

  /// A student's nickname, or a parent's name.
  String get name => me.student?.nickname ?? me.displayName ?? '';
}

/// Signs students and parents in and out. The app is only for them: staff are
/// refused by the API (NOT_FAMILY).
class AuthController extends Notifier<AuthState> {
  final List<Future<void> Function()> _beforeLogout = [];

  @override
  AuthState build() {
    unawaited(Future(restore));
    return const AuthRestoring();
  }

  /// The provider may be gone when an answer arrives (tests, hot restart).
  void _set(AuthState next) {
    if (ref.mounted) state = next;
  }

  KcpApi get _api => ref.read(apiProvider);
  TokenStore get _store => ref.read(tokenStoreProvider);
  SessionTokens get _tokens => ref.read(sessionTokensProvider);

  /// Runs before logging out, while the session still works (push: forget the phone).
  void onBeforeLogout(Future<void> Function() hook) => _beforeLogout.add(hook);

  static const _installedKey = 'kcp.installed';

  /// Picks up the saved session, if there is one.
  Future<void> restore() async {
    if (!ref.mounted) return;
    _set(const AuthRestoring());
    final prefs = ref.read(sharedPreferencesProvider);
    final store = _store;
    if (!(prefs.getBool(_installedKey) ?? false)) {
      // First start after installing: iOS keeps the Keychain when an app is removed,
      // so a reinstall (e.g. to sign a parent out) must not sign anyone back in.
      await store.clear();
      await prefs.setBool(_installedKey, true);
    }
    final saved = await store.readRefreshToken();
    if (!ref.mounted) return;
    if (saved == null) {
      _set(const SignedOut());
      return;
    }
    try {
      final renewed = await ref.read(tokenRefresherProvider).refresh();
      if (!ref.mounted) return;
      if (!renewed) {
        _set(const SignedOut(expired: true));
        return;
      }
      final me = (await _api.getAuthApi().authMe()).data!;
      _set(SignedIn(me));
    } catch (error) {
      final apiError = ApiError.from(error);
      _set(
        apiError.offline || (apiError.status ?? 0) >= 500
            ? const AuthOffline()
            : const SignedOut(expired: true),
      );
    }
  }

  /// A parent signs in with their email and password.
  Future<void> loginParent(String email, String password) async {
    final response = await _api.getAuthApi().authLogin(
      loginDto: LoginDto(
        email: email.trim(),
        password: password,
        tokenDelivery: LoginDtoTokenDeliveryEnum.body,
        app: LoginDtoAppEnum.mobile,
      ),
    );
    await _signedIn(response.data!);
  }

  /// A student signs in with the login name and password their parent gave them.
  Future<void> loginStudent(String username, String password) async {
    final response = await _api.getAuthApi().authLoginStudent(
      studentLoginDto: StudentLoginDto(
        username: username.trim().toLowerCase(),
        password: password,
        tokenDelivery: StudentLoginDtoTokenDeliveryEnum.body,
        app: StudentLoginDtoAppEnum.mobile,
      ),
    );
    await _signedIn(response.data!);
  }

  Future<void> _signedIn(LoginResponseDto result) async {
    if (result.status != LoginResponseDtoStatusEnum.authenticated ||
        result.accessToken == null ||
        result.refreshToken == null ||
        result.user == null) {
      // Two-factor sign-in is for staff, who use the admin panel.
      throw const ApiError(status: 403, code: 'NOT_FAMILY');
    }
    ref.read(tokenRefresherProvider).invalidate();
    _tokens.accessToken = result.accessToken;
    await _store.saveRefreshToken(result.refreshToken!);
    _set(SignedIn(result.user!));
  }

  /// Reloads the account (e.g. after the parent accepted new terms on the website).
  Future<void> reloadMe() async {
    if (state is! SignedIn) return;
    final me = (await _api.getAuthApi().authMe()).data!;
    _set(SignedIn(me));
  }

  Future<void> logout() async {
    for (final hook in _beforeLogout) {
      try {
        await hook();
      } catch (_) {
        // Logging out always works, even offline.
      }
    }
    final refreshToken = await _store.readRefreshToken();
    if (refreshToken != null) {
      try {
        await _api.getAuthApi().authLogout(
          refreshDto: RefreshDto(
            refreshToken: refreshToken,
            tokenDelivery: RefreshDtoTokenDeliveryEnum.body,
            app: RefreshDtoAppEnum.mobile,
          ),
        );
      } catch (_) {
        // The session ends on the server when it expires anyway.
      }
    }
    await _clear();
    _set(const SignedOut());
  }

  /// The session couldn't be renewed: back to the sign-in screen.
  void sessionExpired() {
    if (state is! SignedIn) return;
    unawaited(_clear());
    _set(const SignedOut(expired: true));
  }

  Future<void> _clear() async {
    ref.read(tokenRefresherProvider).invalidate();
    _tokens.accessToken = null;
    await _store.clear();
  }
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);
