//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'event_decision_result_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class EventDecisionResultDto {
  /// Returns a new [EventDecisionResultDto] instance.
  EventDecisionResultDto({required this.status});

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: EventDecisionResultDtoStatusEnum.unknownDefaultOpenApi,
  )
  final EventDecisionResultDtoStatusEnum status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EventDecisionResultDto && other.status == status;

  @override
  int get hashCode => status.hashCode;

  factory EventDecisionResultDto.fromJson(Map<String, dynamic> json) =>
      _$EventDecisionResultDtoFromJson(json);

  Map<String, dynamic> toJson() => _$EventDecisionResultDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum EventDecisionResultDtoStatusEnum {
  @JsonValue(r'APPROVED')
  APPROVED(r'APPROVED'),
  @JsonValue(r'DECLINED')
  DECLINED(r'DECLINED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const EventDecisionResultDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
