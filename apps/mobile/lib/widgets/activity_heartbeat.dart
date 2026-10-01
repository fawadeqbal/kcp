import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api.dart';

/// How often the app says "still learning" (packages/shared ACTIVITY_HEARTBEAT_SECONDS).
const activityHeartbeat = Duration(seconds: 60);

/// While a lesson, an Explorer step or today's practice is open (and the app is on
/// screen), tells the API once a minute: the minutes parents see in the weekly report.
class ActivityHeartbeat extends ConsumerStatefulWidget {
  const ActivityHeartbeat({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ActivityHeartbeat> createState() => _ActivityHeartbeatState();
}

class _ActivityHeartbeatState extends ConsumerState<ActivityHeartbeat> with WidgetsBindingObserver {
  Timer? _timer;
  bool _onScreen = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(activityHeartbeat, (_) => _beat());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _onScreen = state == AppLifecycleState.resumed;
  }

  void _beat() {
    if (!_onScreen || !mounted) return;
    unawaited(
      ref
          .read(apiProvider)
          .getReportsApi()
          .reportsHeartbeat()
          .then((_) => null, onError: (_) => null),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
