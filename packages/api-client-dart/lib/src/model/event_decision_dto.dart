//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'event_decision_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class EventDecisionDto {
  /// Returns a new [EventDecisionDto] instance.
  EventDecisionDto({required this.childId, required this.approve});

  @JsonKey(name: r'childId', required: true, includeIfNull: false)
  final String childId;

  @JsonKey(name: r'approve', required: true, includeIfNull: false)
  final bool approve;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EventDecisionDto &&
          other.childId == childId &&
          other.approve == approve;

  @override
  int get hashCode => childId.hashCode + approve.hashCode;

  factory EventDecisionDto.fromJson(Map<String, dynamic> json) =>
      _$EventDecisionDtoFromJson(json);

  Map<String, dynamic> toJson() => _$EventDecisionDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
