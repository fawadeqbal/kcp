// A smoke test of the app's API calls against a running API (local or staging), with
// the generated client exactly as the app uses it. It signs in as a student, does
// today's practice until it is done (answers come from the server's own "reveal"
// after wrong tries, like a student learning), checks the streak, then signs in as
// a parent. Nothing here ships in the app.
//
//   cd apps/mobile
//   dart run tool/live_check.dart --api http://localhost:3000 \
//     --student <login name> --student-password 'kid pass 42' \
//     --parent parent.en@demo.test --parent-password 'demo password 123'
//
// Use demo accounts (`pnpm demo:accounts`): it answers quizzes and earns XP.

// ignore_for_file: avoid_print

import 'dart:io';

import 'package:dio/dio.dart';
import 'package:kcp_api/kcp_api.dart';

Future<void> main(List<String> args) async {
  final options = <String, String>{};
  for (var i = 0; i + 1 < args.length; i += 2) {
    options[args[i].replaceFirst('--', '')] = args[i + 1];
  }
  final apiUrl = options['api'] ?? 'http://localhost:3000';
  final student = options['student'];
  final studentPassword = options['student-password'] ?? 'kid pass 42';
  final parent = options['parent'];
  final parentPassword = options['parent-password'] ?? 'demo password 123';
  if (student == null || parent == null) {
    stderr.writeln('Usage: dart run tool/live_check.dart --student <login> --parent <email> [...]');
    exit(64);
  }

  KcpApi client([String? token]) => KcpApi(
    dio: Dio(
      BaseOptions(
        baseUrl: apiUrl,
        headers: {'Authorization': ?(token == null ? null : 'Bearer $token')},
      ),
    ),
    interceptors: const [],
  );

  void check(bool ok, String what) {
    if (!ok) throw StateError('FAILED: $what');
    print('ok  $what');
  }

  // ── Student ──
  final login = (await client().getAuthApi().authLoginStudent(
    studentLoginDto: StudentLoginDto(
      username: student,
      password: studentPassword,
      tokenDelivery: StudentLoginDtoTokenDeliveryEnum.body,
      app: StudentLoginDtoAppEnum.mobile,
    ),
  )).data!;
  check(login.refreshToken != null && login.accessToken != null, 'student signs in (tokens in the body)');
  var api = client(login.accessToken);

  final refreshed = (await client().getAuthApi().authRefresh(
    refreshDto: RefreshDto(
      refreshToken: login.refreshToken,
      tokenDelivery: RefreshDtoTokenDeliveryEnum.body,
      app: RefreshDtoAppEnum.mobile,
    ),
  )).data!;
  check(refreshed.refreshToken != login.refreshToken, 'the refresh token rotates');
  api = client(refreshed.accessToken);

  final me = (await api.getAuthApi().authMe()).data!;
  check(me.kind == MeDtoKindEnum.STUDENT && me.student != null, 'who am I: ${me.student?.nickname}');

  final overview = (await api.getLearningApi().learningOverview(lang: 'ur')).data!;
  check(overview.tracks.isNotEmpty, 'lessons in Urdu: ${overview.tracks.length} track(s)');
  final firstLesson = overview.tracks.first.modules.first.lessons.first;
  final lesson = (await api.getLearningApi().learningLesson(id: firstLesson.id, lang: 'ar')).data!;
  check(lesson.quizzes.isNotEmpty, 'a lesson with ${lesson.quizzes.length} quizzes');

  var practice = (await api.getLearningApi().quizzesPractice(lang: 'en')).data!;
  check(practice.total > 0, "today's practice: ${practice.total} quizzes, done: ${practice.done}");

  for (final quiz in practice.quizzes) {
    if (practice.answeredQuizIds.contains(quiz.id)) continue;
    // A first guess; after two wrong tries the server shows the right answer.
    QuizAnswerDto guess() => switch (quiz.kind) {
      PracticeQuizDtoKindEnum.ORDER => QuizAnswerDto(order: [for (final l in quiz.lines) l.id]),
      PracticeQuizDtoKindEnum.BUG => QuizAnswerDto(line: 1),
      _ => QuizAnswerDto(option: quiz.options.first.id),
    };
    var answer = guess();
    for (var attempt = 0; attempt < 4; attempt++) {
      final result = (await api.getLearningApi().quizzesAnswer(
        id: quiz.id,
        quizAnswerDto: answer,
        lang: 'en',
      )).data!;
      if (result.correct) {
        print('    ${quiz.kind.value} ${quiz.id}: right (+${result.xpAwarded} XP)');
        break;
      }
      final reveal = result.reveal;
      answer = reveal == null
          ? switch (quiz.kind) {
              PracticeQuizDtoKindEnum.ORDER => QuizAnswerDto(
                order: [for (final l in quiz.lines.reversed) l.id],
              ),
              PracticeQuizDtoKindEnum.BUG => QuizAnswerDto(line: quiz.lines.length),
              _ => QuizAnswerDto(option: quiz.options.last.id),
            }
          : QuizAnswerDto(order: reveal.order, line: reveal.line, option: reveal.option);
    }
  }
  practice = (await api.getLearningApi().quizzesPractice(lang: 'en')).data!;
  check(practice.done, "today's practice is done");

  final progress = (await api.getProgressApi().progressSummary()).data!;
  check(
    progress.streak.doneToday && progress.streak.current >= 1,
    'the goal is met from the phone: streak ${progress.streak.current}, today ${progress.today.xp} XP',
  );
  final board = (await api.getProgressApi().progressBoard(scope: 'global', period: 'week')).data!;
  check(board.entries.isNotEmpty || !board.available, 'the leaderboard answers');
  final badges = (await api.getProgressApi().progressList()).data!;
  check(badges.badges.isNotEmpty, 'badges: ${badges.badges.where((b) => b.earned).length} earned');

  await client().getAuthApi().authLogout(
    refreshDto: RefreshDto(
      refreshToken: refreshed.refreshToken,
      tokenDelivery: RefreshDtoTokenDeliveryEnum.body,
      app: RefreshDtoAppEnum.mobile,
    ),
  );
  check(true, 'student logs out');

  // ── Parent ──
  final parentLogin = (await client().getAuthApi().authLogin(
    loginDto: LoginDto(
      email: parent,
      password: parentPassword,
      tokenDelivery: LoginDtoTokenDeliveryEnum.body,
      app: LoginDtoAppEnum.mobile,
    ),
  )).data!;
  check(parentLogin.accessToken != null, 'parent signs in');
  final parentApi = client(parentLogin.accessToken);
  final children = (await parentApi.getChildrenApi().childrenList()).data!;
  check(children.isNotEmpty, 'children: ${children.map((c) => c.nickname).join(', ')}');
  final billing = (await parentApi.getBillingApi().billingOverview()).data!;
  check(billing.trialDays >= 0, 'plan status (subscription: ${billing.subscription?.status.value ?? 'none'})');
  final child = children.first;
  final updated = (await parentApi.getChildrenApi().childrenUpdate(
    id: child.id,
    updateChildDto: UpdateChildDto(streakReminders: !child.streakReminders),
  )).data!;
  check(updated.streakReminders != child.streakReminders, 'the streak reminder switch changes');
  await parentApi.getChildrenApi().childrenUpdate(
    id: child.id,
    updateChildDto: UpdateChildDto(streakReminders: child.streakReminders),
  );
  await parentApi.getDevicesApi().devicesRegister(
    registerDeviceDto: RegisterDeviceDto(
      token: 'live-check-${DateTime.now().millisecondsSinceEpoch}-${'x' * 24}',
      platform: RegisterDeviceDtoPlatformEnum.android,
      language: RegisterDeviceDtoLanguageEnum.ur,
    ),
  );
  check(true, 'a phone registers for notifications');
  final notifications = (await parentApi.getNotificationsApi().notificationsList()).data!;
  check(notifications.unread >= 0, 'notifications: ${notifications.items.length}');
  await client().getAppApi().appCrashesReport(
    reportCrashDto: ReportCrashDto(
      appVersion: '0.0.0+live-check',
      platform: ReportCrashDtoPlatformEnum.android,
      osVersion: 'live check',
      fatal: false,
      message: 'Live check: not a real crash',
      stack: '#0 main (tool/live_check.dart)',
    ),
  );
  check(true, 'a crash report is accepted without an account');

  try {
    await client().getAuthApi().authLogin(
      loginDto: LoginDto(
        email: 'nobody@example.com',
        password: 'wrong password',
        app: LoginDtoAppEnum.mobile,
        tokenDelivery: LoginDtoTokenDeliveryEnum.body,
      ),
    );
    check(false, 'a wrong password is refused');
  } on DioException catch (error) {
    check(error.response?.statusCode == 401, 'a wrong password is refused');
  }
  print('\nAll checks passed.');
}
