//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'class_decision_result_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ClassDecisionResultDto {
  /// Returns a new [ClassDecisionResultDto] instance.
  ClassDecisionResultDto({required this.status});

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ClassDecisionResultDtoStatusEnum.unknownDefaultOpenApi,
  )
  final ClassDecisionResultDtoStatusEnum status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClassDecisionResultDto && other.status == status;

  @override
  int get hashCode => status.hashCode;

  factory ClassDecisionResultDto.fromJson(Map<String, dynamic> json) =>
      _$ClassDecisionResultDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ClassDecisionResultDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ClassDecisionResultDtoStatusEnum {
  @JsonValue(r'APPROVED')
  APPROVED(r'APPROVED'),
  @JsonValue(r'DECLINED')
  DECLINED(r'DECLINED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ClassDecisionResultDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
