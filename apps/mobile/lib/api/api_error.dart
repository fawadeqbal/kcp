import 'package:dio/dio.dart';

/// What went wrong with a request, in a form the screens can show: the API's error
/// code (e.g. "INVALID_CREDENTIALS"), or "no connection".
class ApiError implements Exception {
  const ApiError({this.status, this.code, this.message, this.details, this.offline = false});

  /// The HTTP status, when the API answered.
  final int? status;

  /// The API's error code, e.g. "INVALID_CREDENTIALS" or "NOT_FAMILY".
  final String? code;

  /// The API's message (English; screens show their own translated text).
  final String? message;

  /// A few plain values some errors carry, e.g. `reason` for a refused room message.
  final Map<String, Object?>? details;

  /// The phone couldn't reach the API (offline, or the server is down).
  final bool offline;

  bool get isUnauthorized => status == 401;
  bool get isTooManyRequests => status == 429;

  /// Turns anything a request throws into an [ApiError].
  static ApiError from(Object error) {
    if (error is ApiError) return error;
    if (error is DioException) {
      final response = error.response;
      if (response == null) {
        return const ApiError(offline: true);
      }
      final body = response.data;
      String? code;
      String? message;
      Map<String, Object?>? details;
      if (body is Map) {
        code = body['error'] is String ? body['error'] as String : null;
        final raw = body['message'];
        message = raw is String ? raw : (raw is List ? raw.join(' ') : null);
        final extra = body['details'];
        if (extra is Map) details = extra.map((key, value) => MapEntry('$key', value as Object?));
      }
      return ApiError(status: response.statusCode, code: code, message: message, details: details);
    }
    return ApiError(message: error.toString());
  }

  @override
  String toString() => 'ApiError($status, $code, $message${offline ? ', offline' : ''})';
}
