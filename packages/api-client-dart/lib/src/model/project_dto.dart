//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/review_summary_dto.dart';
import 'package:kcp_api/src/model/code_files_dto.dart';
import 'package:kcp_api/src/model/stage_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'project_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ProjectDto {
  /// Returns a new [ProjectDto] instance.
  ProjectDto({
    required this.id,

    required this.moduleId,

    required this.moduleTitle,

    required this.title,

    required this.summary,

    required this.body,

    required this.language,

    required this.xp,

    required this.files,

    required this.starter,

    required this.stage,

    required this.checks,

    required this.hints,

    required this.checkLabels,

    required this.draft,

    required this.status,

    required this.shippedAt,

    required this.version,

    required this.review,
  });

  /// The brief's ID, e.g. \"builder-m01-project\".
  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'moduleId', required: true, includeIfNull: false)
  final String moduleId;

  @JsonKey(name: r'moduleTitle', required: true, includeIfNull: false)
  final String moduleTitle;

  @JsonKey(name: r'title', required: true, includeIfNull: false)
  final String title;

  @JsonKey(name: r'summary', required: true, includeIfNull: false)
  final String summary;

  /// The brief, in Markdown.
  @JsonKey(name: r'body', required: true, includeIfNull: false)
  final String body;

  /// The language the texts are in (English when a translation is missing).
  @JsonKey(name: r'language', required: true, includeIfNull: false)
  final String language;

  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  /// The editor tabs, in order: index.html, style.css, script.js.
  @JsonKey(
    name: r'files',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ProjectDtoFilesEnum.unknownDefaultOpenApi,
  )
  final List<ProjectDtoFilesEnum> files;

  @JsonKey(name: r'starter', required: true, includeIfNull: false)
  final CodeFilesDto starter;

  /// Block projects (Explorer): the level.
  @JsonKey(name: r'stage', required: true, includeIfNull: true)
  final StageDto? stage;

  /// What the project needs before it can ship (see packages/checks).
  @JsonKey(name: r'checks', required: true, includeIfNull: false)
  final List<Object> checks;

  /// Hint texts by key, in the requested language with English filling gaps.
  @JsonKey(name: r'hints', required: true, includeIfNull: false)
  final Map<String, String> hints;

  /// What each check looks at, by check ID, in the requested language (English fills gaps).
  @JsonKey(name: r'checkLabels', required: true, includeIfNull: false)
  final Map<String, String> checkLabels;

  /// The student's saved code, if any.
  @JsonKey(name: r'draft', required: true, includeIfNull: true)
  final CodeFilesDto? draft;

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ProjectDtoStatusEnum.unknownDefaultOpenApi,
  )
  final ProjectDtoStatusEnum status;

  @JsonKey(name: r'shippedAt', required: true, includeIfNull: true)
  final DateTime? shippedAt;

  /// The portfolio version shipped last (1, 2, …), or null.
  @JsonKey(name: r'version', required: true, includeIfNull: true)
  final num? version;

  /// The latest mentor review of this project (premium), or null.
  @JsonKey(name: r'review', required: true, includeIfNull: true)
  final ReviewSummaryDto? review;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProjectDto &&
          other.id == id &&
          other.moduleId == moduleId &&
          other.moduleTitle == moduleTitle &&
          other.title == title &&
          other.summary == summary &&
          other.body == body &&
          other.language == language &&
          other.xp == xp &&
          other.files == files &&
          other.starter == starter &&
          other.stage == stage &&
          other.checks == checks &&
          other.hints == hints &&
          other.checkLabels == checkLabels &&
          other.draft == draft &&
          other.status == status &&
          other.shippedAt == shippedAt &&
          other.version == version &&
          other.review == review;

  @override
  int get hashCode =>
      id.hashCode +
      moduleId.hashCode +
      moduleTitle.hashCode +
      title.hashCode +
      summary.hashCode +
      body.hashCode +
      language.hashCode +
      xp.hashCode +
      files.hashCode +
      starter.hashCode +
      (stage == null ? 0 : stage.hashCode) +
      checks.hashCode +
      hints.hashCode +
      checkLabels.hashCode +
      (draft == null ? 0 : draft.hashCode) +
      status.hashCode +
      (shippedAt == null ? 0 : shippedAt.hashCode) +
      (version == null ? 0 : version.hashCode) +
      (review == null ? 0 : review.hashCode);

  factory ProjectDto.fromJson(Map<String, dynamic> json) =>
      _$ProjectDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ProjectDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ProjectDtoFilesEnum {
  @JsonValue(r'html')
  html(r'html'),
  @JsonValue(r'css')
  css(r'css'),
  @JsonValue(r'js')
  js(r'js'),
  @JsonValue(r'py')
  py(r'py'),
  @JsonValue(r'blocks')
  blocks(r'blocks'),
  @JsonValue(r'git')
  git(r'git'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ProjectDtoFilesEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum ProjectDtoStatusEnum {
  @JsonValue(r'NOT_STARTED')
  NOT_STARTED(r'NOT_STARTED'),
  @JsonValue(r'DRAFT')
  DRAFT(r'DRAFT'),
  @JsonValue(r'SHIPPED')
  SHIPPED(r'SHIPPED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ProjectDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
