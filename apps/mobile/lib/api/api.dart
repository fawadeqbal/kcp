import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../auth/auth_controller.dart';
import '../auth/token_store.dart';
import '../config/app_config.dart';

/// The tokens of the signed-in account: the access token in memory, the refresh
/// token in secure storage (see [TokenStore]).
class SessionTokens {
  String? accessToken;
}

final sessionTokensProvider = Provider<SessionTokens>((ref) => SessionTokens());

/// Replaced in tests with a fake server.
final httpAdapterProvider = Provider<HttpClientAdapter?>((ref) => null);

/// Called when the session can't be renewed (logged out elsewhere, or expired).
typedef SessionExpired = void Function();

/// Refreshes the access token with the stored refresh token (which rotates: the
/// new one is saved). Returns false when the session has ended.
class TokenRefresher {
  TokenRefresher({required this.dio, required this.tokens, required this.store});

  /// A Dio without the auth interceptor.
  final Dio dio;
  final SessionTokens tokens;
  final TokenStore store;
  Completer<bool>? _running;

  /// Changes on logout and sign-in: a refresh that was already on its way then
  /// keeps nothing (it would bring the old session back).
  int _generation = 0;

  void invalidate() => _generation++;

  Future<bool> refresh() {
    final running = _running;
    if (running != null) return running.future;
    final completer = Completer<bool>();
    _running = completer;
    // Offline: the error goes to the caller (the session may still be good).
    _refresh().then(completer.complete, onError: completer.completeError);
    return completer.future.whenComplete(() => _running = null);
  }

  Future<bool> _refresh() async {
    final generation = _generation;
    final refreshToken = await store.readRefreshToken();
    if (refreshToken == null) return false;
    try {
      final response = await AuthApi(dio).authRefresh(
        refreshDto: RefreshDto(
          refreshToken: refreshToken,
          tokenDelivery: RefreshDtoTokenDeliveryEnum.body,
          app: RefreshDtoAppEnum.mobile,
        ),
      );
      final data = response.data;
      if (data?.accessToken == null || data?.refreshToken == null) return false;
      if (generation != _generation) return false;
      tokens.accessToken = data!.accessToken;
      await store.saveRefreshToken(data.refreshToken!);
      return true;
    } on DioException catch (error) {
      // Offline: keep the refresh token and try again later. Refused: it's over.
      final status = error.response?.statusCode;
      if (status == 401 || status == 403) {
        await store.clear();
        tokens.accessToken = null;
        return false;
      }
      rethrow;
    }
  }
}

/// Adds the access token to requests and, when the API says it has expired,
/// refreshes it once and repeats the request.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required this.retryDio,
    required this.tokens,
    required this.refresher,
    required this.onExpired,
  });

  /// Repeats a request after the refresh. It has no interceptors: an error while
  /// this one waits in the queue would otherwise never be handled.
  final Dio retryDio;
  final SessionTokens tokens;
  final TokenRefresher refresher;
  final SessionExpired onExpired;

  static const _retried = 'kcp.retried';
  static const _sentToken = 'kcp.sentToken';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = tokens.accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
      options.extra[_sentToken] = token;
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final error = err;
    final options = error.requestOptions;
    final sentToken = options.extra[_sentToken] as String?;
    if (error.response?.statusCode != 401 || sentToken == null || options.extra[_retried] == true) {
      return handler.next(error);
    }
    // Another request may have refreshed the token while this one waited.
    var renewed = tokens.accessToken != null && tokens.accessToken != sentToken;
    if (!renewed) {
      try {
        renewed = await refresher.refresh();
      } catch (_) {
        return handler.next(error);
      }
    }
    if (!renewed) {
      onExpired();
      return handler.next(error);
    }
    try {
      options.extra[_retried] = true;
      options.headers['Authorization'] = 'Bearer ${tokens.accessToken}';
      options.extra[_sentToken] = tokens.accessToken;
      handler.resolve(await retryDio.fetch<dynamic>(options));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }
}

Dio _baseDio(AppConfig config, HttpClientAdapter? adapter) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: {'Accept': 'application/json'},
    ),
  );
  if (adapter != null) dio.httpClientAdapter = adapter;
  return dio;
}

final tokenRefresherProvider = Provider<TokenRefresher>((ref) {
  return TokenRefresher(
    dio: _baseDio(ref.watch(appConfigProvider), ref.watch(httpAdapterProvider)),
    tokens: ref.watch(sessionTokensProvider),
    store: ref.watch(tokenStoreProvider),
  );
});

/// The API client, with the signed-in account's token.
final apiProvider = Provider<KcpApi>((ref) {
  final dio = _baseDio(ref.watch(appConfigProvider), ref.watch(httpAdapterProvider));
  final refresher = ref.watch(tokenRefresherProvider);
  dio.interceptors.add(
    AuthInterceptor(
      retryDio: refresher.dio,
      tokens: ref.watch(sessionTokensProvider),
      refresher: refresher,
      onExpired: () => ref.read(authControllerProvider.notifier).sessionExpired(),
    ),
  );
  return KcpApi(dio: dio, interceptors: const []);
});

/// Requests that need no account (crash reports), without the auth interceptor.
final publicApiProvider = Provider<KcpApi>((ref) {
  final dio = _baseDio(ref.watch(appConfigProvider), ref.watch(httpAdapterProvider));
  return KcpApi(dio: dio, interceptors: const []);
});
