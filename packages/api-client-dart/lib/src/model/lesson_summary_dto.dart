//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'lesson_summary_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LessonSummaryDto {
  /// Returns a new [LessonSummaryDto] instance.
  LessonSummaryDto({
    required this.id,

    required this.title,

    required this.summary,

    required this.xp,

    required this.isPremium,

    required this.locked,

    required this.challengeCount,

    required this.quizCount,

    required this.status,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'title', required: true, includeIfNull: false)
  final String title;

  @JsonKey(name: r'summary', required: true, includeIfNull: false)
  final String summary;

  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  @JsonKey(name: r'isPremium', required: true, includeIfNull: false)
  final bool isPremium;

  /// Premium, and the student has no premium now (no trial, plan or grant).
  @JsonKey(name: r'locked', required: true, includeIfNull: false)
  final bool locked;

  @JsonKey(name: r'challengeCount', required: true, includeIfNull: false)
  final num challengeCount;

  /// Quizzes the lesson has (short questions that work on a phone).
  @JsonKey(name: r'quizCount', required: true, includeIfNull: false)
  final num quizCount;

  /// Always NOT_STARTED for accounts that aren't students.
  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LessonSummaryDtoStatusEnum.unknownDefaultOpenApi,
  )
  final LessonSummaryDtoStatusEnum status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LessonSummaryDto &&
          other.id == id &&
          other.title == title &&
          other.summary == summary &&
          other.xp == xp &&
          other.isPremium == isPremium &&
          other.locked == locked &&
          other.challengeCount == challengeCount &&
          other.quizCount == quizCount &&
          other.status == status;

  @override
  int get hashCode =>
      id.hashCode +
      title.hashCode +
      summary.hashCode +
      xp.hashCode +
      isPremium.hashCode +
      locked.hashCode +
      challengeCount.hashCode +
      quizCount.hashCode +
      status.hashCode;

  factory LessonSummaryDto.fromJson(Map<String, dynamic> json) =>
      _$LessonSummaryDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LessonSummaryDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// Always NOT_STARTED for accounts that aren't students.
enum LessonSummaryDtoStatusEnum {
  @JsonValue(r'NOT_STARTED')
  NOT_STARTED(r'NOT_STARTED'),
  @JsonValue(r'STARTED')
  STARTED(r'STARTED'),
  @JsonValue(r'COMPLETED')
  COMPLETED(r'COMPLETED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LessonSummaryDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
