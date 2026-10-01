//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'chat_report_created_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChatReportCreatedDto {
  /// Returns a new [ChatReportCreatedDto] instance.
  ChatReportCreatedDto({required this.id});

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is ChatReportCreatedDto && other.id == id;

  @override
  int get hashCode => id.hashCode;

  factory ChatReportCreatedDto.fromJson(Map<String, dynamic> json) =>
      _$ChatReportCreatedDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChatReportCreatedDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
