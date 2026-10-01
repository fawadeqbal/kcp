//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'class_decision_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ClassDecisionDto {
  /// Returns a new [ClassDecisionDto] instance.
  ClassDecisionDto({required this.childId, required this.approve});

  @JsonKey(name: r'childId', required: true, includeIfNull: false)
  final String childId;

  @JsonKey(name: r'approve', required: true, includeIfNull: false)
  final bool approve;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ClassDecisionDto &&
          other.childId == childId &&
          other.approve == approve;

  @override
  int get hashCode => childId.hashCode + approve.hashCode;

  factory ClassDecisionDto.fromJson(Map<String, dynamic> json) =>
      _$ClassDecisionDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ClassDecisionDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
