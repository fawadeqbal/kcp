//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_decision_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentDecisionDto {
  /// Returns a new [ParentDecisionDto] instance.
  ParentDecisionDto({required this.approve});

  @JsonKey(name: r'approve', required: true, includeIfNull: false)
  final bool approve;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentDecisionDto && other.approve == approve;

  @override
  int get hashCode => approve.hashCode;

  factory ParentDecisionDto.fromJson(Map<String, dynamic> json) =>
      _$ParentDecisionDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentDecisionDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
