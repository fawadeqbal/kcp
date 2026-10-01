//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_friend_decision_result_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentFriendDecisionResultDto {
  /// Returns a new [ParentFriendDecisionResultDto] instance.
  ParentFriendDecisionResultDto({required this.status});

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue:
        ParentFriendDecisionResultDtoStatusEnum.unknownDefaultOpenApi,
  )
  final ParentFriendDecisionResultDtoStatusEnum status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentFriendDecisionResultDto && other.status == status;

  @override
  int get hashCode => status.hashCode;

  factory ParentFriendDecisionResultDto.fromJson(Map<String, dynamic> json) =>
      _$ParentFriendDecisionResultDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentFriendDecisionResultDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ParentFriendDecisionResultDtoStatusEnum {
  @JsonValue(r'PENDING')
  PENDING(r'PENDING'),
  @JsonValue(r'APPROVED')
  APPROVED(r'APPROVED'),
  @JsonValue(r'DECLINED')
  DECLINED(r'DECLINED'),
  @JsonValue(r'CANCELLED')
  CANCELLED(r'CANCELLED'),
  @JsonValue(r'EXPIRED')
  EXPIRED(r'EXPIRED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ParentFriendDecisionResultDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
