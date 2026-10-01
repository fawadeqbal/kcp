//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'check_result_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class CheckResultDto {
  /// Returns a new [CheckResultDto] instance.
  CheckResultDto({required this.id, required this.passed, this.hint});

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'passed', required: true, includeIfNull: false)
  final bool passed;

  @JsonKey(name: r'hint', required: false, includeIfNull: false)
  final String? hint;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CheckResultDto &&
          other.id == id &&
          other.passed == passed &&
          other.hint == hint;

  @override
  int get hashCode => id.hashCode + passed.hashCode + hint.hashCode;

  factory CheckResultDto.fromJson(Map<String, dynamic> json) =>
      _$CheckResultDtoFromJson(json);

  Map<String, dynamic> toJson() => _$CheckResultDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
