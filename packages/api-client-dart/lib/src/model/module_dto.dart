//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/lesson_summary_dto.dart';
import 'package:kcp_api/src/model/module_project_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'module_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ModuleDto {
  /// Returns a new [ModuleDto] instance.
  ModuleDto({
    required this.id,

    required this.title,

    required this.description,

    required this.lessons,

    required this.project,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'title', required: true, includeIfNull: false)
  final String title;

  @JsonKey(name: r'description', required: true, includeIfNull: false)
  final String description;

  @JsonKey(name: r'lessons', required: true, includeIfNull: false)
  final List<LessonSummaryDto> lessons;

  @JsonKey(name: r'project', required: true, includeIfNull: true)
  final ModuleProjectDto? project;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ModuleDto &&
          other.id == id &&
          other.title == title &&
          other.description == description &&
          other.lessons == lessons &&
          other.project == project;

  @override
  int get hashCode =>
      id.hashCode +
      title.hashCode +
      description.hashCode +
      lessons.hashCode +
      (project == null ? 0 : project.hashCode);

  factory ModuleDto.fromJson(Map<String, dynamic> json) =>
      _$ModuleDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ModuleDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
