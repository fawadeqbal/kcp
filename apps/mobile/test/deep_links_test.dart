import 'package:flutter_test/flutter_test.dart';
import 'package:kcp_api/kcp_api.dart';
import 'package:kcp_app/auth/auth_controller.dart';
import 'package:kcp_app/router/deep_links.dart';
import 'package:kcp_app/router/router.dart';

import 'support/fixtures.dart';

void main() {
  group('links to the website open the app’s own screens', () {
    test('lessons, the lesson list and the parent dashboard', () {
      expect(
        appRouteFor(Uri.parse('https://app.test/ur/learn/builder-m01-l01')),
        '/lesson/builder-m01-l01',
      );
      expect(appRouteFor(Uri.parse('https://app.test/ar/learn')), '/learn');
      expect(appRouteFor(Uri.parse('https://app.test/en/dashboard')), '/parent');
      expect(appRouteFor(Uri.parse('/practice')), '/practice');
      expect(appRouteFor(Uri.parse('https://app.test/en')), '/');
    });

    test('anything else is not the app’s', () {
      expect(appRouteFor(Uri.parse('https://app.test/en/billing')), isNull);
      expect(appRouteFor(Uri.parse('https://app.test/en/learn/Bad_ID!')), isNull);
      expect(appRouteFor(Uri.parse('https://app.test/en/learn/a/b')), isNull);
      // Pages under /learn that only the website has.
      expect(appRouteFor(Uri.parse('https://app.test/en/learn/portfolio')), isNull);
      expect(appRouteFor(Uri.parse('https://app.test/en/learn/projects')), isNull);
      expect(appRouteFor(Uri.parse('https://app.test/en/learn/leaderboard')), '/leaderboard');
      expect(appRouteFor(Uri.parse('https://app.test/en/learn/badges')), '/me');
    });
  });

  group('where the router sends people', () {
    final student = SignedIn(MeDto.fromJson(meJson()));
    final parent = SignedIn(MeDto.fromJson(meJson(student: false)));
    String? remembered;
    String? go(AuthState auth, String location) => redirectFor(
      auth,
      Uri.parse(location),
      remembered: remembered,
      remember: (value) => remembered = value,
    );

    setUp(() => remembered = null);

    test('the splash while the session loads, and the welcome screen when signed out', () {
      expect(go(const AuthRestoring(), '/home'), '/splash');
      expect(go(const SignedOut(), '/home'), '/welcome');
      expect(go(const SignedOut(), '/login/student'), isNull);
    });

    test('each account to its own start, and away from the other’s screens', () {
      expect(go(student, '/splash'), '/home');
      expect(go(parent, '/splash'), '/parent');
      expect(go(student, '/parent'), '/home');
      expect(go(parent, '/practice'), '/parent');
      expect(go(student, '/lesson/builder-m01-l01'), isNull);
    });

    test('a link opened while signed out waits until the student signs in', () {
      expect(go(const SignedOut(), '/en/learn/builder-m01-l02'), '/welcome');
      expect(remembered, '/lesson/builder-m01-l02');
      expect(go(student, '/login/student'), '/lesson/builder-m01-l02');
      expect(remembered, isNull);
    });
  });
}
