import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../l10n/app_localizations.dart';
import '../../widgets/kcp_icon.dart';

/// The student's tabs: today, lessons, leaderboard and me.
class StudentShell extends StatelessWidget {
  const StudentShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (index) =>
            shell.goBranch(index, initialLocation: index == shell.currentIndex),
        destinations: [
          NavigationDestination(
            icon: const KcpIcon('calendar'),
            selectedIcon: const KcpIcon('calendar'),
            label: t.tabToday,
          ),
          NavigationDestination(
            icon: const KcpIcon('book'),
            selectedIcon: const KcpIcon('book'),
            label: t.tabLearn,
          ),
          NavigationDestination(
            icon: const KcpIcon('trophy'),
            selectedIcon: const KcpIcon('trophy'),
            label: t.tabLeaderboard,
          ),
          NavigationDestination(
            icon: const KcpIcon('user'),
            selectedIcon: const KcpIcon('user'),
            label: t.tabMe,
          ),
        ],
      ),
    );
  }
}
