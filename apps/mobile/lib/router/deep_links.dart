import '../config/preferences.dart';

/// A lesson's ID, e.g. builder-m01-l03 (other pages under /learn are the website's).
final _lessonId = RegExp(r'^[a-z0-9]+(-[a-z0-9]+)*-m\d+-l\d+$');

/// The app's screen for a link: a page of the website (App Links and Universal
/// Links: https://app.kidscoding.example/ur/learn/builder-m01-l01) or a tapped
/// notification's route (/practice). Null when the app has no such screen.
String? appRouteFor(Uri uri) {
  var segments = [
    for (final segment in uri.pathSegments)
      if (segment.isNotEmpty) segment,
  ];
  if (segments.isNotEmpty && supportedLanguages.contains(segments.first)) {
    segments = segments.sublist(1);
  }
  return switch (segments) {
    [] => '/',
    ['learn'] => '/learn',
    ['learn', 'leaderboard'] || ['leaderboard'] => '/leaderboard',
    ['learn', 'badges'] => '/me',
    ['learn', final id] when _lessonId.hasMatch(id) => '/lesson/$id',
    ['lesson', final id] when _lessonId.hasMatch(id) => '/lesson/$id',
    ['practice'] => '/practice',
    ['dashboard'] || ['parent'] => '/parent',
    ['notifications'] => '/notifications',
    _ => null,
  };
}

/// Routes only students see, and routes only parents see.
bool isStudentRoute(String location) =>
    location == '/home' ||
    location == '/learn' ||
    location == '/leaderboard' ||
    location == '/me' ||
    location == '/practice' ||
    location.startsWith('/lesson/');

bool isParentRoute(String location) => location == '/parent' || location.startsWith('/parent/');
