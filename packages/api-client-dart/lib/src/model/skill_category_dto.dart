//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/skill_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'skill_category_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SkillCategoryDto {
  /// Returns a new [SkillCategoryDto] instance.
  SkillCategoryDto({required this.key, required this.skills});

  @JsonKey(
    name: r'key',
    required: true,
    includeIfNull: false,
    unknownEnumValue: SkillCategoryDtoKeyEnum.unknownDefaultOpenApi,
  )
  final SkillCategoryDtoKeyEnum key;

  @JsonKey(name: r'skills', required: true, includeIfNull: false)
  final List<SkillDto> skills;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SkillCategoryDto && other.key == key && other.skills == skills;

  @override
  int get hashCode => key.hashCode + skills.hashCode;

  factory SkillCategoryDto.fromJson(Map<String, dynamic> json) =>
      _$SkillCategoryDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SkillCategoryDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum SkillCategoryDtoKeyEnum {
  @JsonValue(r'logic')
  logic(r'logic'),
  @JsonValue(r'web')
  web(r'web'),
  @JsonValue(r'python')
  python(r'python'),
  @JsonValue(r'teamwork')
  teamwork(r'teamwork'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const SkillCategoryDtoKeyEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
