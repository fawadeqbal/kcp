//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/code_files_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'save_draft_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SaveDraftDto {
  /// Returns a new [SaveDraftDto] instance.
  SaveDraftDto({required this.code});

  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final CodeFilesDto code;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is SaveDraftDto && other.code == code;

  @override
  int get hashCode => code.hashCode;

  factory SaveDraftDto.fromJson(Map<String, dynamic> json) =>
      _$SaveDraftDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SaveDraftDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
