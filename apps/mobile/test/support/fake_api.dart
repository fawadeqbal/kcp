import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

typedef FakeHandler = FutureOr<FakeResponse> Function(FakeRequest request);

class FakeRequest {
  FakeRequest(this.options, this.params);

  final RequestOptions options;

  /// Path parameters, e.g. {"id": "q1"} for /v1/learning/quizzes/{id}/answers.
  final Map<String, String> params;

  String get method => options.method;
  String get path => options.uri.path;
  Map<String, String> get query => options.uri.queryParameters;
  String? get authorization => options.headers['Authorization'] as String?;

  Map<String, dynamic> get json {
    final data = options.data;
    if (data is String && data.isNotEmpty) return jsonDecode(data) as Map<String, dynamic>;
    if (data is Map<String, dynamic>) return data;
    return {};
  }
}

class FakeResponse {
  const FakeResponse(this.body, [this.status = 200]);

  const FakeResponse.empty([this.status = 204]) : body = null;

  factory FakeResponse.error(int status, String code, [String message = '']) =>
      FakeResponse({'statusCode': status, 'error': code, 'message': message}, status);

  final Object? body;
  final int status;
}

/// A pretend API for tests: routes like "GET /v1/progress" or
/// "POST /v1/learning/quizzes/{id}/answers", answered in memory.
class FakeApi implements HttpClientAdapter {
  final _routes = <(String method, RegExp pattern, List<String> names, FakeHandler handler)>[];
  final List<FakeRequest> requests = [];

  /// When set, every request fails as if the phone were offline.
  bool offline = false;

  void on(String method, String path, FakeHandler handler) {
    final names = <String>[];
    final pattern = RegExp(
      '^${path.replaceAllMapped(RegExp(r'\{(\w+)\}'), (m) {
        names.add(m[1]!);
        return '([^/]+)';
      })}\$',
    );
    _routes.insert(0, (method, pattern, names, handler));
  }

  List<FakeRequest> called(String method, String path) => [
    for (final r in requests)
      if (r.method == method && r.path == path) r,
  ];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (offline) {
      throw DioException.connectionError(requestOptions: options, reason: 'offline');
    }
    for (final (method, pattern, names, handler) in _routes) {
      final match = pattern.firstMatch(options.uri.path);
      if (method != options.method || match == null) continue;
      final params = {for (final (i, name) in names.indexed) name: match.group(i + 1)!};
      final request = FakeRequest(options, params);
      requests.add(request);
      final response = await handler(request);
      return ResponseBody.fromString(
        response.body == null ? '' : jsonEncode(response.body),
        response.status,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );
    }
    requests.add(FakeRequest(options, const {}));
    return ResponseBody.fromString(
      jsonEncode({'statusCode': 404, 'error': 'Not Found', 'message': 'No fake route'}),
      404,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
