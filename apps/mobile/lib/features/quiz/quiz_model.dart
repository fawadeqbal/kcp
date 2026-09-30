import 'package:kcp_api/kcp_api.dart';

/// ORDER: put the lines in order. BUG: tap the line with the mistake. OUTPUT: pick
/// what the code shows. CHOICE: pick the right answer.
enum QuizKind { order, bug, output, choice }

class QuizLine {
  const QuizLine(this.id, this.text);

  final String id;
  final String text;
}

class QuizOption {
  const QuizOption({required this.id, this.text, this.code});

  final String id;

  /// Words in the app's language; null when the option is code.
  final String? text;

  /// Code (may span lines); null for a text option.
  final String? code;
}

/// A quiz as the app shows it, from a lesson or from today's practice.
class QuizItem {
  const QuizItem({
    required this.id,
    required this.lessonId,
    required this.kind,
    required this.xp,
    required this.prompt,
    required this.lines,
    required this.options,
    required this.solved,
    this.lessonTitle,
  });

  factory QuizItem.fromLesson(QuizDto quiz) => QuizItem(
    id: quiz.id,
    lessonId: quiz.lessonId,
    kind: _kind(quiz.kind.value),
    xp: quiz.xp.toInt(),
    prompt: quiz.prompt,
    lines: [for (final line in quiz.lines) QuizLine(line.id, line.text)],
    options: [
      for (final option in quiz.options)
        QuizOption(id: option.id, text: option.text, code: option.code),
    ],
    solved: quiz.solved,
  );

  factory QuizItem.fromPractice(PracticeQuizDto quiz) => QuizItem(
    id: quiz.id,
    lessonId: quiz.lessonId,
    kind: _kind(quiz.kind.value),
    xp: quiz.xp.toInt(),
    prompt: quiz.prompt,
    lines: [for (final line in quiz.lines) QuizLine(line.id, line.text)],
    options: [
      for (final option in quiz.options)
        QuizOption(id: option.id, text: option.text, code: option.code),
    ],
    solved: quiz.solved,
    lessonTitle: quiz.lessonTitle,
  );

  final String id;
  final String lessonId;
  final QuizKind kind;
  final int xp;
  final String prompt;

  /// ORDER: the lines, shuffled by the server. Otherwise the code (IDs are line numbers).
  final List<QuizLine> lines;
  final List<QuizOption> options;
  final bool solved;

  /// For today's practice: which lesson the quiz is from.
  final String? lessonTitle;

  static QuizKind _kind(String value) => switch (value) {
    'ORDER' => QuizKind.order,
    'BUG' => QuizKind.bug,
    'OUTPUT' => QuizKind.output,
    _ => QuizKind.choice,
  };
}

/// What the student answered.
class QuizAnswer {
  const QuizAnswer.order(List<String> this.order) : line = null, option = null;
  const QuizAnswer.line(int this.line) : order = null, option = null;
  const QuizAnswer.option(String this.option) : order = null, line = null;

  final List<String>? order;
  final int? line;
  final String? option;

  QuizAnswerDto toDto() => QuizAnswerDto(order: order, line: line, option: option);
}
