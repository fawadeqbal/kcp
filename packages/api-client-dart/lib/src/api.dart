//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

import 'package:dio/dio.dart';
import 'package:kcp_api/src/auth/api_key_auth.dart';
import 'package:kcp_api/src/auth/basic_auth.dart';
import 'package:kcp_api/src/auth/bearer_auth.dart';
import 'package:kcp_api/src/auth/oauth.dart';
import 'package:kcp_api/src/api/account_api.dart';
import 'package:kcp_api/src/api/app_api.dart';
import 'package:kcp_api/src/api/auth_api.dart';
import 'package:kcp_api/src/api/billing_api.dart';
import 'package:kcp_api/src/api/certificates_api.dart';
import 'package:kcp_api/src/api/children_api.dart';
import 'package:kcp_api/src/api/devices_api.dart';
import 'package:kcp_api/src/api/feedback_api.dart';
import 'package:kcp_api/src/api/learning_api.dart';
import 'package:kcp_api/src/api/notifications_api.dart';
import 'package:kcp_api/src/api/progress_api.dart';
import 'package:kcp_api/src/api/reference_api.dart';

class KcpApi {
  static const String basePath = r'http://localhost';

  final Dio dio;
  KcpApi({Dio? dio, String? basePathOverride, List<Interceptor>? interceptors})
    : this.dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: basePathOverride ?? basePath,
              connectTimeout: const Duration(milliseconds: 5000),
              receiveTimeout: const Duration(milliseconds: 3000),
            ),
          ) {
    if (interceptors == null) {
      this.dio.interceptors.addAll([
        OAuthInterceptor(),
        BasicAuthInterceptor(),
        BearerAuthInterceptor(),
        ApiKeyAuthInterceptor(),
      ]);
    } else {
      this.dio.interceptors.addAll(interceptors);
    }
  }

  void setOAuthToken(String name, String token) {
    if (this.dio.interceptors.any((i) => i is OAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is OAuthInterceptor)
                  as OAuthInterceptor)
              .tokens[name] =
          token;
    }
  }

  /// Removes the OAuth token associated with the given [name].
  ///
  /// If no [OAuthInterceptor] is registered or no token exists for the given
  /// [name], this method has no effect.
  void removeOAuthToken(String name) {
    if (this.dio.interceptors.any((i) => i is OAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is OAuthInterceptor)
              as OAuthInterceptor)
          .tokens
          .remove(name);
    }
  }

  void setBearerAuth(String name, String token) {
    if (this.dio.interceptors.any((i) => i is BearerAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BearerAuthInterceptor)
                  as BearerAuthInterceptor)
              .tokens[name] =
          token;
    }
  }

  /// Removes the bearer authentication token associated with the given [name].
  ///
  /// If no [BearerAuthInterceptor] is registered or no token exists for the
  /// given [name], this method has no effect.
  void removeBearerAuth(String name) {
    if (this.dio.interceptors.any((i) => i is BearerAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BearerAuthInterceptor)
              as BearerAuthInterceptor)
          .tokens
          .remove(name);
    }
  }

  void setBasicAuth(String name, String username, String password) {
    if (this.dio.interceptors.any((i) => i is BasicAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BasicAuthInterceptor)
              as BasicAuthInterceptor)
          .authInfo[name] = BasicAuthInfo(
        username,
        password,
      );
    }
  }

  /// Removes the basic authentication credentials associated with the given [name].
  ///
  /// If no [BasicAuthInterceptor] is registered or no credentials exist for the
  /// given [name], this method has no effect.
  void removeBasicAuth(String name) {
    if (this.dio.interceptors.any((i) => i is BasicAuthInterceptor)) {
      (this.dio.interceptors.firstWhere((i) => i is BasicAuthInterceptor)
              as BasicAuthInterceptor)
          .authInfo
          .remove(name);
    }
  }

  void setApiKey(String name, String apiKey) {
    if (this.dio.interceptors.any((i) => i is ApiKeyAuthInterceptor)) {
      (this.dio.interceptors.firstWhere(
                    (element) => element is ApiKeyAuthInterceptor,
                  )
                  as ApiKeyAuthInterceptor)
              .apiKeys[name] =
          apiKey;
    }
  }

  /// Removes the API key associated with the given [name].
  ///
  /// If no [ApiKeyAuthInterceptor] is registered or no API key exists for the
  /// given [name], this method has no effect.
  void removeApiKey(String name) {
    if (this.dio.interceptors.any((i) => i is ApiKeyAuthInterceptor)) {
      (this.dio.interceptors.firstWhere(
                (element) => element is ApiKeyAuthInterceptor,
              )
              as ApiKeyAuthInterceptor)
          .apiKeys
          .remove(name);
    }
  }

  /// Get AccountApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  AccountApi getAccountApi() {
    return AccountApi(dio);
  }

  /// Get AppApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  AppApi getAppApi() {
    return AppApi(dio);
  }

  /// Get AuthApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  AuthApi getAuthApi() {
    return AuthApi(dio);
  }

  /// Get BillingApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  BillingApi getBillingApi() {
    return BillingApi(dio);
  }

  /// Get CertificatesApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  CertificatesApi getCertificatesApi() {
    return CertificatesApi(dio);
  }

  /// Get ChildrenApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  ChildrenApi getChildrenApi() {
    return ChildrenApi(dio);
  }

  /// Get DevicesApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  DevicesApi getDevicesApi() {
    return DevicesApi(dio);
  }

  /// Get FeedbackApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  FeedbackApi getFeedbackApi() {
    return FeedbackApi(dio);
  }

  /// Get LearningApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  LearningApi getLearningApi() {
    return LearningApi(dio);
  }

  /// Get NotificationsApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  NotificationsApi getNotificationsApi() {
    return NotificationsApi(dio);
  }

  /// Get ProgressApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  ProgressApi getProgressApi() {
    return ProgressApi(dio);
  }

  /// Get ReferenceApi instance, base route and serializer can be overridden by a given but be careful,
  /// by doing that all interceptors will not be executed
  ReferenceApi getReferenceApi() {
    return ReferenceApi(dio);
  }
}
