import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../features/leaderboard/leaderboard_screen.dart';
import '../features/learn/learn_screen.dart';
import '../features/lesson/lesson_screen.dart';
import '../features/login/login_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/parent/child_screen.dart';
import '../features/parent/parent_home_screen.dart';
import '../features/practice/practice_screen.dart';
import '../features/settings/feedback_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/student/home_screen.dart';
import '../features/student/me_screen.dart';
import '../features/student/student_shell.dart';
import '../features/welcome/splash_screen.dart';
import '../features/welcome/welcome_screen.dart';
import '../l10n/app_localizations.dart';
import 'deep_links.dart';

/// Tells the router to look again when someone signs in or out.
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authControllerProvider, (_, _) => notifyListeners());
  }
}

/// Where a signed-in account starts.
String homeFor(SignedIn auth) => auth.isStudent ? '/home' : '/parent';

final _signedOutRoutes = {'/welcome', '/login/student', '/login/parent'};

/// Decides where a location really goes: the splash while the session loads, the
/// welcome screen when signed out (remembering a link to open after signing in),
/// and each account's own screens.
String? redirectFor(
  AuthState auth,
  Uri uri, {
  required void Function(String?) remember,
  String? remembered,
}) {
  final location = uri.path;
  // Links to the website, and notification routes, become the app's own screens.
  final isAppRoute =
      location == '/splash' ||
      _signedOutRoutes.contains(location) ||
      isStudentRoute(location) ||
      isParentRoute(location) ||
      location == '/settings' ||
      location == '/feedback' ||
      location == '/notifications';
  final target = isAppRoute ? location : (appRouteFor(uri) ?? '/');

  switch (auth) {
    case AuthRestoring() || AuthOffline():
      if (target != '/splash' && target != '/') remember(target);
      return location == '/splash' ? null : '/splash';
    case SignedOut():
      if (_signedOutRoutes.contains(target)) return target == location ? null : target;
      if (target != '/splash' && target != '/') remember(target);
      return '/welcome';
    case SignedIn():
      final home = homeFor(auth);
      var next = target;
      if (next == '/' || next == '/splash' || _signedOutRoutes.contains(next)) {
        next = remembered ?? home;
        remember(null);
      }
      // Each account sees its own screens only.
      if ((auth.isStudent && isParentRoute(next)) || (!auth.isStudent && isStudentRoute(next))) {
        next = home;
      }
      return next == location ? null : next;
  }
}

class _NotFoundScreen extends StatelessWidget {
  const _NotFoundScreen();

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(t.notFound, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: () => context.go('/'), child: Text(t.backHome)),
            ],
          ),
        ),
      ),
    );
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  String? remembered;
  final router = GoRouter(
    initialLocation: '/splash',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) => redirectFor(
      ref.read(authControllerProvider),
      state.uri,
      remembered: remembered,
      remember: (value) => remembered = value,
    ),
    routes: [
      GoRoute(path: '/', redirect: (_, _) => '/splash'),
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/welcome', builder: (_, _) => const WelcomeScreen()),
      GoRoute(path: '/login/student', builder: (_, _) => const LoginScreen(parent: false)),
      GoRoute(path: '/login/parent', builder: (_, _) => const LoginScreen(parent: true)),
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => StudentShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/home', builder: (_, _) => const StudentHomeScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/learn', builder: (_, _) => const LearnScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/leaderboard', builder: (_, _) => const LeaderboardScreen())],
          ),
          StatefulShellBranch(
            routes: [GoRoute(path: '/me', builder: (_, _) => const MeScreen())],
          ),
        ],
      ),
      GoRoute(path: '/practice', builder: (_, _) => const PracticeScreen()),
      GoRoute(
        path: '/lesson/:id',
        builder: (_, state) => LessonScreen(lessonId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/parent',
        builder: (_, _) => const ParentHomeScreen(),
        routes: [
          GoRoute(
            path: 'child/:id',
            builder: (_, state) => ChildScreen(childId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(path: '/notifications', builder: (_, _) => const NotificationsScreen()),
      GoRoute(path: '/settings', builder: (_, _) => const SettingsScreen()),
      GoRoute(path: '/feedback', builder: (_, _) => const FeedbackScreen()),
    ],
    errorBuilder: (context, state) => const _NotFoundScreen(),
  );
  ref.onDispose(router.dispose);
  return router;
});
