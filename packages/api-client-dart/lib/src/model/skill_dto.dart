//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'skill_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SkillDto {
  /// Returns a new [SkillDto] instance.
  SkillDto({
    required this.key,

    required this.name,

    required this.lessonsDone,

    required this.lessonsTotal,

    required this.learned,
  });

  @JsonKey(name: r'key', required: true, includeIfNull: false)
  final String key;

  @JsonKey(name: r'name', required: true, includeIfNull: false)
  final String name;

  /// Lessons that teach it, finished by the student.
  @JsonKey(name: r'lessonsDone', required: true, includeIfNull: false)
  final num lessonsDone;

  @JsonKey(name: r'lessonsTotal', required: true, includeIfNull: false)
  final num lessonsTotal;

  /// At least one lesson that teaches it is finished.
  @JsonKey(name: r'learned', required: true, includeIfNull: false)
  final bool learned;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SkillDto &&
          other.key == key &&
          other.name == name &&
          other.lessonsDone == lessonsDone &&
          other.lessonsTotal == lessonsTotal &&
          other.learned == learned;

  @override
  int get hashCode =>
      key.hashCode +
      name.hashCode +
      lessonsDone.hashCode +
      lessonsTotal.hashCode +
      learned.hashCode;

  factory SkillDto.fromJson(Map<String, dynamic> json) =>
      _$SkillDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SkillDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
