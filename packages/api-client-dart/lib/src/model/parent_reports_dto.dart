//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/parent_report_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_reports_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentReportsDto {
  /// Returns a new [ParentReportsDto] instance.
  ParentReportsDto({required this.reports});

  /// Newest first (the last eight weeks).
  @JsonKey(name: r'reports', required: true, includeIfNull: false)
  final List<ParentReportDto> reports;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentReportsDto && other.reports == reports;

  @override
  int get hashCode => reports.hashCode;

  factory ParentReportsDto.fromJson(Map<String, dynamic> json) =>
      _$ParentReportsDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentReportsDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
