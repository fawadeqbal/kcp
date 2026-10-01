//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/report_child_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_report_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentReportDto {
  /// Returns a new [ParentReportDto] instance.
  ParentReportDto({
    required this.weekKey,

    required this.startDay,

    required this.endDay,

    required this.createdAt,

    required this.children,

    required this.skillNames,
  });

  @JsonKey(name: r'weekKey', required: true, includeIfNull: false)
  final String weekKey;

  @JsonKey(name: r'startDay', required: true, includeIfNull: false)
  final String startDay;

  @JsonKey(name: r'endDay', required: true, includeIfNull: false)
  final String endDay;

  @JsonKey(name: r'createdAt', required: true, includeIfNull: false)
  final DateTime createdAt;

  @JsonKey(name: r'children', required: true, includeIfNull: false)
  final List<ReportChildDto> children;

  /// Skill names in the requested language, by key.
  @JsonKey(name: r'skillNames', required: true, includeIfNull: false)
  final Map<String, String> skillNames;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentReportDto &&
          other.weekKey == weekKey &&
          other.startDay == startDay &&
          other.endDay == endDay &&
          other.createdAt == createdAt &&
          other.children == children &&
          other.skillNames == skillNames;

  @override
  int get hashCode =>
      weekKey.hashCode +
      startDay.hashCode +
      endDay.hashCode +
      createdAt.hashCode +
      children.hashCode +
      skillNames.hashCode;

  factory ParentReportDto.fromJson(Map<String, dynamic> json) =>
      _$ParentReportDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentReportDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
