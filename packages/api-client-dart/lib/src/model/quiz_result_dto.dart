//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/practice_progress_dto.dart';
import 'package:kcp_api/src/model/quiz_reveal_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'quiz_result_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class QuizResultDto {
  /// Returns a new [QuizResultDto] instance.
  QuizResultDto({
    required this.correct,

    required this.explanation,

    required this.reveal,

    required this.xpAwarded,

    required this.dailyCapReached,

    required this.badgesEarned,

    required this.practice,
  });

  @JsonKey(name: r'correct', required: true, includeIfNull: false)
  final bool correct;

  /// Why the answer is right: shown once the quiz is answered correctly or revealed.
  @JsonKey(name: r'explanation', required: true, includeIfNull: true)
  final String? explanation;

  /// After a few wrong tries, the right answer, so the student can learn from it.
  @JsonKey(name: r'reveal', required: true, includeIfNull: true)
  final QuizRevealDto? reveal;

  /// XP this answer earned: the quiz's on the first right answer (none once the answer has been shown), and today's practice when this answer finished it.
  @JsonKey(name: r'xpAwarded', required: true, includeIfNull: false)
  final num xpAwarded;

  @JsonKey(name: r'dailyCapReached', required: true, includeIfNull: false)
  final bool dailyCapReached;

  @JsonKey(name: r'badgesEarned', required: true, includeIfNull: false)
  final List<String> badgesEarned;

  /// When the quiz is part of today's practice: how far along it is.
  @JsonKey(name: r'practice', required: true, includeIfNull: true)
  final PracticeProgressDto? practice;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuizResultDto &&
          other.correct == correct &&
          other.explanation == explanation &&
          other.reveal == reveal &&
          other.xpAwarded == xpAwarded &&
          other.dailyCapReached == dailyCapReached &&
          other.badgesEarned == badgesEarned &&
          other.practice == practice;

  @override
  int get hashCode =>
      correct.hashCode +
      (explanation == null ? 0 : explanation.hashCode) +
      (reveal == null ? 0 : reveal.hashCode) +
      xpAwarded.hashCode +
      dailyCapReached.hashCode +
      badgesEarned.hashCode +
      (practice == null ? 0 : practice.hashCode);

  factory QuizResultDto.fromJson(Map<String, dynamic> json) =>
      _$QuizResultDtoFromJson(json);

  Map<String, dynamic> toJson() => _$QuizResultDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
