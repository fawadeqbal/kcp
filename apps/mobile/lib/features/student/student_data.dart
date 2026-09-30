import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kcp_api/kcp_api.dart';

import '../../api/api.dart';
import '../../config/preferences.dart';
import '../quiz/quiz_model.dart';

/// XP, level, today's goal and the streak.
final progressProvider = FutureProvider.autoDispose<ProgressDto>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getProgressApi().progressSummary()).data!;
});

/// Today's practice: a few quizzes from the lessons the student is on.
final practiceProvider = FutureProvider.autoDispose<PracticeDto>((ref) async {
  final api = ref.watch(apiProvider);
  final lang = ref.watch(appLanguageProvider);
  return (await api.getLearningApi().quizzesPractice(lang: lang)).data!;
});

/// Tracks, modules and lessons with the student's progress.
final overviewProvider = FutureProvider.autoDispose<LearningOverviewDto>((ref) async {
  final api = ref.watch(apiProvider);
  final lang = ref.watch(appLanguageProvider);
  return (await api.getLearningApi().learningOverview(lang: lang)).data!;
});

/// One lesson. Opening it counts as starting it (its quizzes join the practice).
final lessonProvider = FutureProvider.autoDispose.family<LessonDto, String>((ref, id) async {
  final api = ref.watch(apiProvider);
  final lang = ref.watch(appLanguageProvider);
  final lesson = (await api.getLearningApi().learningLesson(id: id, lang: lang)).data!;
  if (lesson.status != LessonDtoStatusEnum.COMPLETED) {
    api.getLearningApi().learningStart(id: id).ignore();
  }
  return lesson;
});

/// This week's board: global, or the student's country, region or city.
final leaderboardProvider = FutureProvider.autoDispose.family<LeaderboardDto, String>((
  ref,
  scope,
) async {
  final api = ref.watch(apiProvider);
  final lang = ref.watch(appLanguageProvider);
  return (await api.getProgressApi().progressBoard(scope: scope, period: 'week', lang: lang)).data!;
});

final badgesProvider = FutureProvider.autoDispose<BadgesDto>((ref) async {
  final api = ref.watch(apiProvider);
  return (await api.getProgressApi().progressList()).data!;
});

/// Sends a quiz answer; the server grades it.
Future<QuizResultDto> answerQuiz(WidgetRef ref, QuizItem quiz, QuizAnswer answer) async {
  final api = ref.read(apiProvider);
  final lang = ref.read(appLanguageProvider);
  final response = await api.getLearningApi().quizzesAnswer(
    id: quiz.id,
    quizAnswerDto: answer.toDto(),
    lang: lang,
  );
  return response.data!;
}
