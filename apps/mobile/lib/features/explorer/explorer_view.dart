import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../config/preferences.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/common.dart';
import 'explorer_bridge.dart';

/// The page that runs the block editor and Bit's world: a WebView on phones and
/// tablets, a fake in widget tests (which have no WebView).
abstract class ExplorerPage {
  Widget build(BuildContext context);

  /// Runs one of [ExplorerCalls] in the page.
  Future<void> call(String script);

  void dispose();
}

typedef ExplorerPageFactory =
    ExplorerPage Function({required Color background, required void Function(String) onMessage});

/// The page's HTML and scripts ship inside the app (assets/explorer): nothing is
/// loaded from the network, and the page can't open other pages.
class WebViewExplorerPage implements ExplorerPage {
  WebViewExplorerPage({required Color background, required void Function(String) onMessage}) {
    _controller = WebViewController();
    unawaited(_load(background, onMessage));
  }

  static const asset = 'assets/explorer/index.html';

  late final WebViewController _controller;

  Future<void> _load(Color background, void Function(String) onMessage) async {
    await _controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await _controller.setBackgroundColor(background);
    await _controller.enableZoom(false);
    await _controller.addJavaScriptChannel(
      'KcpBridge',
      onMessageReceived: (message) => onMessage(message.message),
    );
    await _controller.setNavigationDelegate(
      NavigationDelegate(
        // Only the page itself: a link in it never opens anything.
        onNavigationRequest: (request) =>
            request.url.endsWith('/$asset') || request.url.endsWith('explorer/index.html')
            ? NavigationDecision.navigate
            : NavigationDecision.prevent,
      ),
    );
    await _controller.loadFlutterAsset(asset);
  }

  @override
  Widget build(BuildContext context) => WebViewWidget(controller: _controller);

  @override
  Future<void> call(String script) => _controller.runJavaScript(script);

  @override
  void dispose() {}
}

final explorerPageProvider = Provider<ExplorerPageFactory>((ref) => WebViewExplorerPage.new);

/// What a screen asks of the Explorer view: check the blocks, play them, replace them.
class ExplorerController {
  _ExplorerViewState? _view;

  /// The checks, run in the page (the server runs them again when the result is sent).
  Future<List<CheckResultDto>> check(List<Object> checks) =>
      _view?._check(checks) ?? Future.error(StateError('The Explorer is not showing'));

  Future<void> run() => _view?._call(ExplorerCalls.run()) ?? Future.value();

  Future<void> setProgram(String program) =>
      _view?._call(ExplorerCalls.setProgram(program)) ?? Future.value();
}

/// The block editor and Bit's world for one step. The page has its own tabs on
/// phones (blocks, Bit's world, the code) and shows the editor and the stage side
/// by side on tablets.
class ExplorerView extends ConsumerStatefulWidget {
  const ExplorerView({
    super.key,
    required this.level,
    required this.program,
    required this.onChange,
    this.controller,
    this.readOnly = false,
  });

  final StageDto level;

  /// The program to start with (the `blocks` file).
  final String program;
  final ValueChanged<String> onChange;
  final ExplorerController? controller;
  final bool readOnly;

  @override
  ConsumerState<ExplorerView> createState() => _ExplorerViewState();
}

class _ExplorerViewState extends ConsumerState<ExplorerView> {
  ExplorerPage? _page;
  bool _started = false;
  bool _failed = false;
  int _requests = 0;
  final _pending = <String, Completer<List<CheckResultDto>>>{};
  late String _program = widget.program;

  @override
  void initState() {
    super.initState();
    widget.controller?._view = this;
  }

  @override
  void didUpdateWidget(ExplorerView old) {
    super.didUpdateWidget(old);
    if (old.controller != widget.controller) {
      if (old.controller?._view == this) old.controller?._view = null;
      widget.controller?._view = this;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _page ??= ref.read(explorerPageProvider)(
      background: Theme.of(context).scaffoldBackgroundColor,
      onMessage: _onMessage,
    );
  }

  @override
  void dispose() {
    if (widget.controller?._view == this) widget.controller?._view = null;
    for (final pending in _pending.values) {
      pending.completeError(StateError('The Explorer closed'));
    }
    _page?.dispose();
    super.dispose();
  }

  Future<void> _call(String script) async {
    await _page?.call(script);
  }

  void _onMessage(String raw) {
    if (!mounted) return;
    switch (ExplorerMessage.parse(raw)) {
      case ExplorerReady():
        unawaited(
          _call(
            ExplorerCalls.start(
              locale: ref.read(appLanguageProvider),
              level: widget.level,
              program: _program,
              dark: Theme.of(context).brightness == Brightness.dark,
              readOnly: widget.readOnly,
            ),
          ),
        );
      case ExplorerStarted():
        setState(() {
          _started = true;
          _failed = false;
        });
      case ExplorerChange(:final program):
        _program = program;
        widget.onChange(program);
      case ExplorerResults(:final requestId, :final results):
        _pending.remove(requestId)?.complete(results);
      case ExplorerFailed():
        setState(() => _failed = true);
      case null:
        break;
    }
  }

  Future<List<CheckResultDto>> _check(List<Object> checks) {
    final requestId = 'r${++_requests}';
    final completer = Completer<List<CheckResultDto>>();
    _pending[requestId] = completer;
    _call(ExplorerCalls.check(requestId, checks)).catchError((Object error) {
      _pending.remove(requestId)?.completeError(error);
    });
    return completer.future.timeout(
      const Duration(seconds: 15),
      onTimeout: () {
        _pending.remove(requestId);
        throw TimeoutException('No results from the Explorer');
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Stack(
      fit: StackFit.expand,
      children: [
        Semantics(label: t.explorerMascot, container: true, child: _page!.build(context)),
        if (_failed)
          ColoredBox(
            color: Theme.of(context).scaffoldBackgroundColor,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(t.explorerLoadFailed, textAlign: TextAlign.center),
              ),
            ),
          )
        else if (!_started)
          ColoredBox(
            color: Theme.of(context).scaffoldBackgroundColor,
            child: LoadingView(label: t.explorerLoading),
          ),
      ],
    );
  }
}
