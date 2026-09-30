//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'module_project_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ModuleProjectDto {
  /// Returns a new [ModuleProjectDto] instance.
  ModuleProjectDto({
    required this.id,

    required this.title,

    required this.summary,

    required this.xp,

    required this.isPremium,

    required this.locked,

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

  /// Premium, and the student has no premium now.
  @JsonKey(name: r'locked', required: true, includeIfNull: false)
  final bool locked;

  /// NOT_STARTED, DRAFT (saved but not shipped) or SHIPPED. Always NOT_STARTED for adults.
  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ModuleProjectDtoStatusEnum.unknownDefaultOpenApi,
  )
  final ModuleProjectDtoStatusEnum status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ModuleProjectDto &&
          other.id == id &&
          other.title == title &&
          other.summary == summary &&
          other.xp == xp &&
          other.isPremium == isPremium &&
          other.locked == locked &&
          other.status == status;

  @override
  int get hashCode =>
      id.hashCode +
      title.hashCode +
      summary.hashCode +
      xp.hashCode +
      isPremium.hashCode +
      locked.hashCode +
      status.hashCode;

  factory ModuleProjectDto.fromJson(Map<String, dynamic> json) =>
      _$ModuleProjectDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ModuleProjectDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// NOT_STARTED, DRAFT (saved but not shipped) or SHIPPED. Always NOT_STARTED for adults.
enum ModuleProjectDtoStatusEnum {
  @JsonValue(r'NOT_STARTED')
  NOT_STARTED(r'NOT_STARTED'),
  @JsonValue(r'DRAFT')
  DRAFT(r'DRAFT'),
  @JsonValue(r'SHIPPED')
  SHIPPED(r'SHIPPED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ModuleProjectDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
