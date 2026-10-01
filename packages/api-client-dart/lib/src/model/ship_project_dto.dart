//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/check_result_dto.dart';
import 'package:kcp_api/src/model/code_files_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'ship_project_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ShipProjectDto {
  /// Returns a new [ShipProjectDto] instance.
  ShipProjectDto({required this.code, required this.results});

  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final CodeFilesDto code;

  /// What the requirement checks in the browser sandbox found.
  @JsonKey(name: r'results', required: true, includeIfNull: false)
  final List<CheckResultDto> results;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ShipProjectDto && other.code == code && other.results == results;

  @override
  int get hashCode => code.hashCode + results.hashCode;

  factory ShipProjectDto.fromJson(Map<String, dynamic> json) =>
      _$ShipProjectDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ShipProjectDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
