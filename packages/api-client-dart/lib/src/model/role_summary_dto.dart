//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'role_summary_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class RoleSummaryDto {
  /// Returns a new [RoleSummaryDto] instance.
  RoleSummaryDto({
    required this.key,

    required this.name,

    required this.isStaff,
  });

  @JsonKey(name: r'key', required: true, includeIfNull: false)
  final String key;

  @JsonKey(name: r'name', required: true, includeIfNull: false)
  final String name;

  @JsonKey(name: r'isStaff', required: true, includeIfNull: false)
  final bool isStaff;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RoleSummaryDto &&
          other.key == key &&
          other.name == name &&
          other.isStaff == isStaff;

  @override
  int get hashCode => key.hashCode + name.hashCode + isStaff.hashCode;

  factory RoleSummaryDto.fromJson(Map<String, dynamic> json) =>
      _$RoleSummaryDtoFromJson(json);

  Map<String, dynamic> toJson() => _$RoleSummaryDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
