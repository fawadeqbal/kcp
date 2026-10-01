//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'git_setup_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class GitSetupDto {
  /// Returns a new [GitSetupDto] instance.
  GitSetupDto({required this.files, this.setup});

  /// The folder's files: path → content.
  @JsonKey(name: r'files', required: true, includeIfNull: false)
  final Map<String, String> files;

  /// Steps already taken before the student starts: { run } | { write, content } | { remove }.
  @JsonKey(name: r'setup', required: false, includeIfNull: false)
  final List<Object>? setup;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GitSetupDto && other.files == files && other.setup == setup;

  @override
  int get hashCode => files.hashCode + setup.hashCode;

  factory GitSetupDto.fromJson(Map<String, dynamic> json) =>
      _$GitSetupDtoFromJson(json);

  Map<String, dynamic> toJson() => _$GitSetupDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
