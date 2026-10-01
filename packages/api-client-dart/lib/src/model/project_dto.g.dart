// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'project_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ProjectDtoCWProxy {
  ProjectDto id(String id);

  ProjectDto moduleId(String moduleId);

  ProjectDto moduleTitle(String moduleTitle);

  ProjectDto title(String title);

  ProjectDto summary(String summary);

  ProjectDto body(String body);

  ProjectDto language(String language);

  ProjectDto xp(num xp);

  ProjectDto files(List<ProjectDtoFilesEnum> files);

  ProjectDto starter(CodeFilesDto starter);

  ProjectDto stage(StageDto? stage);

  ProjectDto checks(List<Object> checks);

  ProjectDto hints(Map<String, String> hints);

  ProjectDto checkLabels(Map<String, String> checkLabels);

  ProjectDto draft(CodeFilesDto? draft);

  ProjectDto status(ProjectDtoStatusEnum status);

  ProjectDto shippedAt(DateTime? shippedAt);

  ProjectDto version(num? version);

  ProjectDto review(ReviewSummaryDto? review);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ProjectDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ProjectDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ProjectDto call({
    String id,
    String moduleId,
    String moduleTitle,
    String title,
    String summary,
    String body,
    String language,
    num xp,
    List<ProjectDtoFilesEnum> files,
    CodeFilesDto starter,
    StageDto? stage,
    List<Object> checks,
    Map<String, String> hints,
    Map<String, String> checkLabels,
    CodeFilesDto? draft,
    ProjectDtoStatusEnum status,
    DateTime? shippedAt,
    num? version,
    ReviewSummaryDto? review,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfProjectDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfProjectDto.copyWith.fieldName(...)`
class _$ProjectDtoCWProxyImpl implements _$ProjectDtoCWProxy {
  const _$ProjectDtoCWProxyImpl(this._value);

  final ProjectDto _value;

  @override
  ProjectDto id(String id) => this(id: id);

  @override
  ProjectDto moduleId(String moduleId) => this(moduleId: moduleId);

  @override
  ProjectDto moduleTitle(String moduleTitle) => this(moduleTitle: moduleTitle);

  @override
  ProjectDto title(String title) => this(title: title);

  @override
  ProjectDto summary(String summary) => this(summary: summary);

  @override
  ProjectDto body(String body) => this(body: body);

  @override
  ProjectDto language(String language) => this(language: language);

  @override
  ProjectDto xp(num xp) => this(xp: xp);

  @override
  ProjectDto files(List<ProjectDtoFilesEnum> files) => this(files: files);

  @override
  ProjectDto starter(CodeFilesDto starter) => this(starter: starter);

  @override
  ProjectDto stage(StageDto? stage) => this(stage: stage);

  @override
  ProjectDto checks(List<Object> checks) => this(checks: checks);

  @override
  ProjectDto hints(Map<String, String> hints) => this(hints: hints);

  @override
  ProjectDto checkLabels(Map<String, String> checkLabels) =>
      this(checkLabels: checkLabels);

  @override
  ProjectDto draft(CodeFilesDto? draft) => this(draft: draft);

  @override
  ProjectDto status(ProjectDtoStatusEnum status) => this(status: status);

  @override
  ProjectDto shippedAt(DateTime? shippedAt) => this(shippedAt: shippedAt);

  @override
  ProjectDto version(num? version) => this(version: version);

  @override
  ProjectDto review(ReviewSummaryDto? review) => this(review: review);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ProjectDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ProjectDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ProjectDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? moduleId = const $CopyWithPlaceholder(),
    Object? moduleTitle = const $CopyWithPlaceholder(),
    Object? title = const $CopyWithPlaceholder(),
    Object? summary = const $CopyWithPlaceholder(),
    Object? body = const $CopyWithPlaceholder(),
    Object? language = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? files = const $CopyWithPlaceholder(),
    Object? starter = const $CopyWithPlaceholder(),
    Object? stage = const $CopyWithPlaceholder(),
    Object? checks = const $CopyWithPlaceholder(),
    Object? hints = const $CopyWithPlaceholder(),
    Object? checkLabels = const $CopyWithPlaceholder(),
    Object? draft = const $CopyWithPlaceholder(),
    Object? status = const $CopyWithPlaceholder(),
    Object? shippedAt = const $CopyWithPlaceholder(),
    Object? version = const $CopyWithPlaceholder(),
    Object? review = const $CopyWithPlaceholder(),
  }) {
    return ProjectDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      moduleId: moduleId == const $CopyWithPlaceholder()
          ? _value.moduleId
          // ignore: cast_nullable_to_non_nullable
          : moduleId as String,
      moduleTitle: moduleTitle == const $CopyWithPlaceholder()
          ? _value.moduleTitle
          // ignore: cast_nullable_to_non_nullable
          : moduleTitle as String,
      title: title == const $CopyWithPlaceholder()
          ? _value.title
          // ignore: cast_nullable_to_non_nullable
          : title as String,
      summary: summary == const $CopyWithPlaceholder()
          ? _value.summary
          // ignore: cast_nullable_to_non_nullable
          : summary as String,
      body: body == const $CopyWithPlaceholder()
          ? _value.body
          // ignore: cast_nullable_to_non_nullable
          : body as String,
      language: language == const $CopyWithPlaceholder()
          ? _value.language
          // ignore: cast_nullable_to_non_nullable
          : language as String,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      files: files == const $CopyWithPlaceholder()
          ? _value.files
          // ignore: cast_nullable_to_non_nullable
          : files as List<ProjectDtoFilesEnum>,
      starter: starter == const $CopyWithPlaceholder()
          ? _value.starter
          // ignore: cast_nullable_to_non_nullable
          : starter as CodeFilesDto,
      stage: stage == const $CopyWithPlaceholder()
          ? _value.stage
          // ignore: cast_nullable_to_non_nullable
          : stage as StageDto?,
      checks: checks == const $CopyWithPlaceholder()
          ? _value.checks
          // ignore: cast_nullable_to_non_nullable
          : checks as List<Object>,
      hints: hints == const $CopyWithPlaceholder()
          ? _value.hints
          // ignore: cast_nullable_to_non_nullable
          : hints as Map<String, String>,
      checkLabels: checkLabels == const $CopyWithPlaceholder()
          ? _value.checkLabels
          // ignore: cast_nullable_to_non_nullable
          : checkLabels as Map<String, String>,
      draft: draft == const $CopyWithPlaceholder()
          ? _value.draft
          // ignore: cast_nullable_to_non_nullable
          : draft as CodeFilesDto?,
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as ProjectDtoStatusEnum,
      shippedAt: shippedAt == const $CopyWithPlaceholder()
          ? _value.shippedAt
          // ignore: cast_nullable_to_non_nullable
          : shippedAt as DateTime?,
      version: version == const $CopyWithPlaceholder()
          ? _value.version
          // ignore: cast_nullable_to_non_nullable
          : version as num?,
      review: review == const $CopyWithPlaceholder()
          ? _value.review
          // ignore: cast_nullable_to_non_nullable
          : review as ReviewSummaryDto?,
    );
  }
}

extension $ProjectDtoCopyWith on ProjectDto {
  /// Returns a callable class that can be used as follows: `instanceOfProjectDto.copyWith(...)` or like so:`instanceOfProjectDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ProjectDtoCWProxy get copyWith => _$ProjectDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ProjectDto _$ProjectDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ProjectDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'id',
      'moduleId',
      'moduleTitle',
      'title',
      'summary',
      'body',
      'language',
      'xp',
      'files',
      'starter',
      'stage',
      'checks',
      'hints',
      'checkLabels',
      'draft',
      'status',
      'shippedAt',
      'version',
      'review',
    ],
  );
  final val = ProjectDto(
    id: $checkedConvert('id', (v) => v as String),
    moduleId: $checkedConvert('moduleId', (v) => v as String),
    moduleTitle: $checkedConvert('moduleTitle', (v) => v as String),
    title: $checkedConvert('title', (v) => v as String),
    summary: $checkedConvert('summary', (v) => v as String),
    body: $checkedConvert('body', (v) => v as String),
    language: $checkedConvert('language', (v) => v as String),
    xp: $checkedConvert('xp', (v) => v as num),
    files: $checkedConvert(
      'files',
      (v) => (v as List<dynamic>)
          .map(
            (e) => $enumDecode(
              _$ProjectDtoFilesEnumEnumMap,
              e,
              unknownValue: ProjectDtoFilesEnum.unknownDefaultOpenApi,
            ),
          )
          .toList(),
    ),
    starter: $checkedConvert(
      'starter',
      (v) => CodeFilesDto.fromJson(v as Map<String, dynamic>),
    ),
    stage: $checkedConvert(
      'stage',
      (v) => v == null ? null : StageDto.fromJson(v as Map<String, dynamic>),
    ),
    checks: $checkedConvert(
      'checks',
      (v) => (v as List<dynamic>).map((e) => e as Object).toList(),
    ),
    hints: $checkedConvert('hints', (v) => Map<String, String>.from(v as Map)),
    checkLabels: $checkedConvert(
      'checkLabels',
      (v) => Map<String, String>.from(v as Map),
    ),
    draft: $checkedConvert(
      'draft',
      (v) =>
          v == null ? null : CodeFilesDto.fromJson(v as Map<String, dynamic>),
    ),
    status: $checkedConvert(
      'status',
      (v) => $enumDecode(
        _$ProjectDtoStatusEnumEnumMap,
        v,
        unknownValue: ProjectDtoStatusEnum.unknownDefaultOpenApi,
      ),
    ),
    shippedAt: $checkedConvert(
      'shippedAt',
      (v) => v == null ? null : DateTime.parse(v as String),
    ),
    version: $checkedConvert('version', (v) => v as num?),
    review: $checkedConvert(
      'review',
      (v) => v == null
          ? null
          : ReviewSummaryDto.fromJson(v as Map<String, dynamic>),
    ),
  );
  return val;
});

Map<String, dynamic> _$ProjectDtoToJson(
  ProjectDto instance,
) => <String, dynamic>{
  'id': instance.id,
  'moduleId': instance.moduleId,
  'moduleTitle': instance.moduleTitle,
  'title': instance.title,
  'summary': instance.summary,
  'body': instance.body,
  'language': instance.language,
  'xp': instance.xp,
  'files': instance.files.map((e) => _$ProjectDtoFilesEnumEnumMap[e]!).toList(),
  'starter': instance.starter.toJson(),
  'stage': instance.stage?.toJson(),
  'checks': instance.checks,
  'hints': instance.hints,
  'checkLabels': instance.checkLabels,
  'draft': instance.draft?.toJson(),
  'status': _$ProjectDtoStatusEnumEnumMap[instance.status]!,
  'shippedAt': instance.shippedAt?.toIso8601String(),
  'version': instance.version,
  'review': instance.review?.toJson(),
};

const _$ProjectDtoFilesEnumEnumMap = {
  ProjectDtoFilesEnum.html: 'html',
  ProjectDtoFilesEnum.css: 'css',
  ProjectDtoFilesEnum.js: 'js',
  ProjectDtoFilesEnum.py: 'py',
  ProjectDtoFilesEnum.blocks: 'blocks',
  ProjectDtoFilesEnum.git: 'git',
  ProjectDtoFilesEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$ProjectDtoStatusEnumEnumMap = {
  ProjectDtoStatusEnum.NOT_STARTED: 'NOT_STARTED',
  ProjectDtoStatusEnum.DRAFT: 'DRAFT',
  ProjectDtoStatusEnum.SHIPPED: 'SHIPPED',
  ProjectDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
