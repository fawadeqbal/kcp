//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/skill_category_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'skill_map_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SkillMapDto {
  /// Returns a new [SkillMapDto] instance.
  SkillMapDto({
    required this.categories,

    required this.learned,

    required this.total,
  });

  @JsonKey(name: r'categories', required: true, includeIfNull: false)
  final List<SkillCategoryDto> categories;

  @JsonKey(name: r'learned', required: true, includeIfNull: false)
  final num learned;

  @JsonKey(name: r'total', required: true, includeIfNull: false)
  final num total;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SkillMapDto &&
          other.categories == categories &&
          other.learned == learned &&
          other.total == total;

  @override
  int get hashCode => categories.hashCode + learned.hashCode + total.hashCode;

  factory SkillMapDto.fromJson(Map<String, dynamic> json) =>
      _$SkillMapDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SkillMapDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
