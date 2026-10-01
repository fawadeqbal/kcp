// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'challenge_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChallengeDtoCWProxy {
  ChallengeDto id(String id);

  ChallengeDto title(String title);

  ChallengeDto instructions(String instructions);

  ChallengeDto type(ChallengeDtoTypeEnum type);

  ChallengeDto xp(num xp);

  ChallengeDto files(List<ChallengeDtoFilesEnum> files);

  ChallengeDto starter(CodeFilesDto starter);

  ChallengeDto stage(StageDto? stage);

  ChallengeDto repo(GitSetupDto? repo);

  ChallengeDto checks(List<Object> checks);

  ChallengeDto hints(Map<String, String> hints);

  ChallengeDto checkLabels(Map<String, String> checkLabels);

  ChallengeDto draft(CodeFilesDto? draft);

  ChallengeDto passed(bool passed);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChallengeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChallengeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChallengeDto call({
    String id,
    String title,
    String instructions,
    ChallengeDtoTypeEnum type,
    num xp,
    List<ChallengeDtoFilesEnum> files,
    CodeFilesDto starter,
    StageDto? stage,
    GitSetupDto? repo,
    List<Object> checks,
    Map<String, String> hints,
    Map<String, String> checkLabels,
    CodeFilesDto? draft,
    bool passed,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChallengeDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChallengeDto.copyWith.fieldName(...)`
class _$ChallengeDtoCWProxyImpl implements _$ChallengeDtoCWProxy {
  const _$ChallengeDtoCWProxyImpl(this._value);

  final ChallengeDto _value;

  @override
  ChallengeDto id(String id) => this(id: id);

  @override
  ChallengeDto title(String title) => this(title: title);

  @override
  ChallengeDto instructions(String instructions) =>
      this(instructions: instructions);

  @override
  ChallengeDto type(ChallengeDtoTypeEnum type) => this(type: type);

  @override
  ChallengeDto xp(num xp) => this(xp: xp);

  @override
  ChallengeDto files(List<ChallengeDtoFilesEnum> files) => this(files: files);

  @override
  ChallengeDto starter(CodeFilesDto starter) => this(starter: starter);

  @override
  ChallengeDto stage(StageDto? stage) => this(stage: stage);

  @override
  ChallengeDto repo(GitSetupDto? repo) => this(repo: repo);

  @override
  ChallengeDto checks(List<Object> checks) => this(checks: checks);

  @override
  ChallengeDto hints(Map<String, String> hints) => this(hints: hints);

  @override
  ChallengeDto checkLabels(Map<String, String> checkLabels) =>
      this(checkLabels: checkLabels);

  @override
  ChallengeDto draft(CodeFilesDto? draft) => this(draft: draft);

  @override
  ChallengeDto passed(bool passed) => this(passed: passed);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChallengeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChallengeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChallengeDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? title = const $CopyWithPlaceholder(),
    Object? instructions = const $CopyWithPlaceholder(),
    Object? type = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? files = const $CopyWithPlaceholder(),
    Object? starter = const $CopyWithPlaceholder(),
    Object? stage = const $CopyWithPlaceholder(),
    Object? repo = const $CopyWithPlaceholder(),
    Object? checks = const $CopyWithPlaceholder(),
    Object? hints = const $CopyWithPlaceholder(),
    Object? checkLabels = const $CopyWithPlaceholder(),
    Object? draft = const $CopyWithPlaceholder(),
    Object? passed = const $CopyWithPlaceholder(),
  }) {
    return ChallengeDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      title: title == const $CopyWithPlaceholder()
          ? _value.title
          // ignore: cast_nullable_to_non_nullable
          : title as String,
      instructions: instructions == const $CopyWithPlaceholder()
          ? _value.instructions
          // ignore: cast_nullable_to_non_nullable
          : instructions as String,
      type: type == const $CopyWithPlaceholder()
          ? _value.type
          // ignore: cast_nullable_to_non_nullable
          : type as ChallengeDtoTypeEnum,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      files: files == const $CopyWithPlaceholder()
          ? _value.files
          // ignore: cast_nullable_to_non_nullable
          : files as List<ChallengeDtoFilesEnum>,
      starter: starter == const $CopyWithPlaceholder()
          ? _value.starter
          // ignore: cast_nullable_to_non_nullable
          : starter as CodeFilesDto,
      stage: stage == const $CopyWithPlaceholder()
          ? _value.stage
          // ignore: cast_nullable_to_non_nullable
          : stage as StageDto?,
      repo: repo == const $CopyWithPlaceholder()
          ? _value.repo
          // ignore: cast_nullable_to_non_nullable
          : repo as GitSetupDto?,
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
      passed: passed == const $CopyWithPlaceholder()
          ? _value.passed
          // ignore: cast_nullable_to_non_nullable
          : passed as bool,
    );
  }
}

extension $ChallengeDtoCopyWith on ChallengeDto {
  /// Returns a callable class that can be used as follows: `instanceOfChallengeDto.copyWith(...)` or like so:`instanceOfChallengeDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChallengeDtoCWProxy get copyWith => _$ChallengeDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChallengeDto _$ChallengeDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ChallengeDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'id',
      'title',
      'instructions',
      'type',
      'xp',
      'files',
      'starter',
      'stage',
      'repo',
      'checks',
      'hints',
      'checkLabels',
      'draft',
      'passed',
    ],
  );
  final val = ChallengeDto(
    id: $checkedConvert('id', (v) => v as String),
    title: $checkedConvert('title', (v) => v as String),
    instructions: $checkedConvert('instructions', (v) => v as String),
    type: $checkedConvert(
      'type',
      (v) => $enumDecode(
        _$ChallengeDtoTypeEnumEnumMap,
        v,
        unknownValue: ChallengeDtoTypeEnum.unknownDefaultOpenApi,
      ),
    ),
    xp: $checkedConvert('xp', (v) => v as num),
    files: $checkedConvert(
      'files',
      (v) => (v as List<dynamic>)
          .map(
            (e) => $enumDecode(
              _$ChallengeDtoFilesEnumEnumMap,
              e,
              unknownValue: ChallengeDtoFilesEnum.unknownDefaultOpenApi,
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
    repo: $checkedConvert(
      'repo',
      (v) => v == null ? null : GitSetupDto.fromJson(v as Map<String, dynamic>),
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
    passed: $checkedConvert('passed', (v) => v as bool),
  );
  return val;
});

Map<String, dynamic> _$ChallengeDtoToJson(ChallengeDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'instructions': instance.instructions,
      'type': _$ChallengeDtoTypeEnumEnumMap[instance.type]!,
      'xp': instance.xp,
      'files': instance.files
          .map((e) => _$ChallengeDtoFilesEnumEnumMap[e]!)
          .toList(),
      'starter': instance.starter.toJson(),
      'stage': instance.stage?.toJson(),
      'repo': instance.repo?.toJson(),
      'checks': instance.checks,
      'hints': instance.hints,
      'checkLabels': instance.checkLabels,
      'draft': instance.draft?.toJson(),
      'passed': instance.passed,
    };

const _$ChallengeDtoTypeEnumEnumMap = {
  ChallengeDtoTypeEnum.HTML: 'HTML',
  ChallengeDtoTypeEnum.CSS: 'CSS',
  ChallengeDtoTypeEnum.JS: 'JS',
  ChallengeDtoTypeEnum.PYTHON: 'PYTHON',
  ChallengeDtoTypeEnum.BLOCKS: 'BLOCKS',
  ChallengeDtoTypeEnum.GIT: 'GIT',
  ChallengeDtoTypeEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$ChallengeDtoFilesEnumEnumMap = {
  ChallengeDtoFilesEnum.html: 'html',
  ChallengeDtoFilesEnum.css: 'css',
  ChallengeDtoFilesEnum.js: 'js',
  ChallengeDtoFilesEnum.py: 'py',
  ChallengeDtoFilesEnum.blocks: 'blocks',
  ChallengeDtoFilesEnum.git: 'git',
  ChallengeDtoFilesEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
