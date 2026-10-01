//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/check_result_dto.dart';
import 'package:kcp_api/src/model/code_files_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'submit_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SubmitDto {
  /// Returns a new [SubmitDto] instance.
  SubmitDto({required this.code, required this.results});

  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final CodeFilesDto code;

  /// What the checks in the browser sandbox found, one entry per check.
  @JsonKey(name: r'results', required: true, includeIfNull: false)
  final List<CheckResultDto> results;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SubmitDto && other.code == code && other.results == results;

  @override
  int get hashCode => code.hashCode + results.hashCode;

  factory SubmitDto.fromJson(Map<String, dynamic> json) =>
      _$SubmitDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SubmitDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
