//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/track_dto.dart';
import 'package:kcp_api/src/model/premium_info_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'learning_overview_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LearningOverviewDto {
  /// Returns a new [LearningOverviewDto] instance.
  LearningOverviewDto({
    required this.tracks,

    required this.nextLessonId,

    required this.lessonsCompleted,

    required this.premium,
  });

  @JsonKey(name: r'tracks', required: true, includeIfNull: false)
  final List<TrackDto> tracks;

  /// Where \"Continue\" goes: the first lesson the student hasn't completed.
  @JsonKey(name: r'nextLessonId', required: true, includeIfNull: true)
  final String? nextLessonId;

  @JsonKey(name: r'lessonsCompleted', required: true, includeIfNull: false)
  final num lessonsCompleted;

  /// The student's premium (null for parents and staff, who can open everything).
  @JsonKey(name: r'premium', required: true, includeIfNull: true)
  final PremiumInfoDto? premium;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LearningOverviewDto &&
          other.tracks == tracks &&
          other.nextLessonId == nextLessonId &&
          other.lessonsCompleted == lessonsCompleted &&
          other.premium == premium;

  @override
  int get hashCode =>
      tracks.hashCode +
      (nextLessonId == null ? 0 : nextLessonId.hashCode) +
      lessonsCompleted.hashCode +
      (premium == null ? 0 : premium.hashCode);

  factory LearningOverviewDto.fromJson(Map<String, dynamic> json) =>
      _$LearningOverviewDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LearningOverviewDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
