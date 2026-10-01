import 'dart:convert';

import 'package:kcp_api/kcp_api.dart';

/// A message from the Explorer page (assets/explorer, built from
/// tools/explorer-embed) through the `KcpBridge` JavaScript channel.
sealed class ExplorerMessage {
  const ExplorerMessage();

  /// Null for anything that isn't one of the page's messages: the page is ours,
  /// but a message is still only data.
  static ExplorerMessage? parse(String raw) {
    Object? data;
    try {
      data = jsonDecode(raw);
    } on FormatException {
      return null;
    }
    if (data is! Map<String, dynamic>) return null;
    switch (data['type']) {
      case 'ready':
        return const ExplorerReady();
      case 'started':
        return const ExplorerStarted();
      case 'change':
        final program = data['program'];
        return program is String ? ExplorerChange(program) : null;
      case 'results':
        final requestId = data['requestId'];
        final results = data['results'];
        if (requestId is! String || results is! List) return null;
        final parsed = <CheckResultDto>[];
        for (final item in results) {
          if (item is! Map<String, dynamic>) return null;
          final id = item['id'];
          final passed = item['passed'];
          final hint = item['hint'];
          if (id is! String || passed is! bool) return null;
          parsed.add(CheckResultDto(id: id, passed: passed, hint: hint is String ? hint : null));
        }
        return ExplorerResults(requestId, parsed);
      case 'error':
        return ExplorerFailed('${data['message']}');
    }
    return null;
  }
}

/// The page has loaded: it waits for [ExplorerCalls.start].
class ExplorerReady extends ExplorerMessage {
  const ExplorerReady();
}

/// The editor and the stage are showing.
class ExplorerStarted extends ExplorerMessage {
  const ExplorerStarted();
}

/// The student changed the program (the `blocks` file, as JSON text).
class ExplorerChange extends ExplorerMessage {
  const ExplorerChange(this.program);

  final String program;
}

/// The checks, run on the phone by the same code as the web app and the API.
class ExplorerResults extends ExplorerMessage {
  const ExplorerResults(this.requestId, this.results);

  final String requestId;
  final List<CheckResultDto> results;
}

class ExplorerFailed extends ExplorerMessage {
  const ExplorerFailed(this.message);

  final String message;
}

/// The JavaScript the app runs in the page (`window.KcpExplorer`). Every value is
/// JSON-encoded, so nothing a student typed can become code.
abstract final class ExplorerCalls {
  static String start({
    required String locale,
    required StageDto level,
    required String program,
    required bool dark,
    bool readOnly = false,
  }) {
    final config = {
      'locale': locale,
      'level': level.toJson(),
      'program': program,
      'dark': dark,
      'readOnly': readOnly,
    };
    return 'window.KcpExplorer.start(${jsonEncode(config)});';
  }

  static String setProgram(String program) =>
      'window.KcpExplorer.setProgram(${jsonEncode(program)});';

  static String run() => 'window.KcpExplorer.run();';

  static String check(String requestId, List<Object> checks) =>
      'window.KcpExplorer.check(${jsonEncode(requestId)}, ${jsonEncode(checks)});';

  static String show(ExplorerPane pane) => 'window.KcpExplorer.show(${jsonEncode(pane.name)});';
}

/// What the page shows on a phone: the blocks, Bit's world or the code.
enum ExplorerPane { blocks, stage, code }
