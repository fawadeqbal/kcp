//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/check_result_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'submission_result_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SubmissionResultDto {
  /// Returns a new [SubmissionResultDto] instance.
  SubmissionResultDto({
    required this.passed,

    required this.results,

    required this.lessonCompleted,

    required this.nextLessonId,

    required this.xpAwarded,

    required this.dailyCapReached,

    required this.badgesEarned,
  });

  @JsonKey(name: r'passed', required: true, includeIfNull: false)
  final bool passed;

  /// The result stored for each of the challenge's checks.
  @JsonKey(name: r'results', required: true, includeIfNull: false)
  final List<CheckResultDto> results;

  /// True when this submission completed the lesson (every challenge passed).
  @JsonKey(name: r'lessonCompleted', required: true, includeIfNull: false)
  final bool lessonCompleted;

  @JsonKey(name: r'nextLessonId', required: true, includeIfNull: true)
  final String? nextLessonId;

  /// XP this submission earned (challenge and, when completed, the lesson).
  @JsonKey(name: r'xpAwarded', required: true, includeIfNull: false)
  final num xpAwarded;

  /// True when the daily XP cap held some of it back.
  @JsonKey(name: r'dailyCapReached', required: true, includeIfNull: false)
  final bool dailyCapReached;

  /// Badges this earned (keys; names are translated in the apps), to celebrate.
  @JsonKey(name: r'badgesEarned', required: true, includeIfNull: false)
  final List<String> badgesEarned;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubmissionResultDto &&
          other.passed == passed &&
          other.results == results &&
          other.lessonCompleted == lessonCompleted &&
          other.nextLessonId == nextLessonId &&
          other.xpAwarded == xpAwarded &&
          other.dailyCapReached == dailyCapReached &&
          other.badgesEarned == badgesEarned;

  @override
  int get hashCode =>
      passed.hashCode +
      results.hashCode +
      lessonCompleted.hashCode +
      (nextLessonId == null ? 0 : nextLessonId.hashCode) +
      xpAwarded.hashCode +
      dailyCapReached.hashCode +
      badgesEarned.hashCode;

  factory SubmissionResultDto.fromJson(Map<String, dynamic> json) =>
      _$SubmissionResultDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SubmissionResultDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
