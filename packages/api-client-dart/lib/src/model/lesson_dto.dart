//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/quiz_dto.dart';
import 'package:kcp_api/src/model/challenge_dto.dart';
import 'package:kcp_api/src/model/video_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'lesson_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LessonDto {
  /// Returns a new [LessonDto] instance.
  LessonDto({
    required this.id,

    required this.trackId,

    required this.moduleId,

    required this.moduleTitle,

    required this.number,

    required this.lessonCount,

    required this.title,

    required this.summary,

    required this.body,

    required this.language,

    required this.video,

    required this.xp,

    required this.isPremium,

    required this.status,

    required this.previousLessonId,

    required this.nextLessonId,

    required this.challenges,

    required this.quizzes,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'trackId', required: true, includeIfNull: false)
  final String trackId;

  @JsonKey(name: r'moduleId', required: true, includeIfNull: false)
  final String moduleId;

  @JsonKey(name: r'moduleTitle', required: true, includeIfNull: false)
  final String moduleTitle;

  /// Position in the module, starting at 1.
  @JsonKey(name: r'number', required: true, includeIfNull: false)
  final num number;

  @JsonKey(name: r'lessonCount', required: true, includeIfNull: false)
  final num lessonCount;

  @JsonKey(name: r'title', required: true, includeIfNull: false)
  final String title;

  @JsonKey(name: r'summary', required: true, includeIfNull: false)
  final String summary;

  /// The explainer, in Markdown.
  @JsonKey(name: r'body', required: true, includeIfNull: false)
  final String body;

  /// The language the texts are in (English when a translation is missing).
  @JsonKey(name: r'language', required: true, includeIfNull: false)
  final String language;

  @JsonKey(name: r'video', required: true, includeIfNull: true)
  final VideoDto? video;

  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  @JsonKey(name: r'isPremium', required: true, includeIfNull: false)
  final bool isPremium;

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LessonDtoStatusEnum.unknownDefaultOpenApi,
  )
  final LessonDtoStatusEnum status;

  @JsonKey(name: r'previousLessonId', required: true, includeIfNull: true)
  final String? previousLessonId;

  @JsonKey(name: r'nextLessonId', required: true, includeIfNull: true)
  final String? nextLessonId;

  @JsonKey(name: r'challenges', required: true, includeIfNull: false)
  final List<ChallengeDto> challenges;

  /// Short questions about the lesson (graded by the server).
  @JsonKey(name: r'quizzes', required: true, includeIfNull: false)
  final List<QuizDto> quizzes;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LessonDto &&
          other.id == id &&
          other.trackId == trackId &&
          other.moduleId == moduleId &&
          other.moduleTitle == moduleTitle &&
          other.number == number &&
          other.lessonCount == lessonCount &&
          other.title == title &&
          other.summary == summary &&
          other.body == body &&
          other.language == language &&
          other.video == video &&
          other.xp == xp &&
          other.isPremium == isPremium &&
          other.status == status &&
          other.previousLessonId == previousLessonId &&
          other.nextLessonId == nextLessonId &&
          other.challenges == challenges &&
          other.quizzes == quizzes;

  @override
  int get hashCode =>
      id.hashCode +
      trackId.hashCode +
      moduleId.hashCode +
      moduleTitle.hashCode +
      number.hashCode +
      lessonCount.hashCode +
      title.hashCode +
      summary.hashCode +
      body.hashCode +
      language.hashCode +
      (video == null ? 0 : video.hashCode) +
      xp.hashCode +
      isPremium.hashCode +
      status.hashCode +
      (previousLessonId == null ? 0 : previousLessonId.hashCode) +
      (nextLessonId == null ? 0 : nextLessonId.hashCode) +
      challenges.hashCode +
      quizzes.hashCode;

  factory LessonDto.fromJson(Map<String, dynamic> json) =>
      _$LessonDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LessonDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum LessonDtoStatusEnum {
  @JsonValue(r'NOT_STARTED')
  NOT_STARTED(r'NOT_STARTED'),
  @JsonValue(r'STARTED')
  STARTED(r'STARTED'),
  @JsonValue(r'COMPLETED')
  COMPLETED(r'COMPLETED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LessonDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
