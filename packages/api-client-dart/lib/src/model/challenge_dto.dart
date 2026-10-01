//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/git_setup_dto.dart';
import 'package:kcp_api/src/model/code_files_dto.dart';
import 'package:kcp_api/src/model/stage_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'challenge_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChallengeDto {
  /// Returns a new [ChallengeDto] instance.
  ChallengeDto({
    required this.id,

    required this.title,

    required this.instructions,

    required this.type,

    required this.xp,

    required this.files,

    required this.starter,

    required this.stage,

    required this.repo,

    required this.checks,

    required this.hints,

    required this.checkLabels,

    required this.draft,

    required this.passed,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'title', required: true, includeIfNull: false)
  final String title;

  /// Markdown.
  @JsonKey(name: r'instructions', required: true, includeIfNull: false)
  final String instructions;

  @JsonKey(
    name: r'type',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ChallengeDtoTypeEnum.unknownDefaultOpenApi,
  )
  final ChallengeDtoTypeEnum type;

  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  /// The editor tabs, in order.
  @JsonKey(
    name: r'files',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ChallengeDtoFilesEnum.unknownDefaultOpenApi,
  )
  final List<ChallengeDtoFilesEnum> files;

  @JsonKey(name: r'starter', required: true, includeIfNull: false)
  final CodeFilesDto starter;

  /// BLOCKS: the level.
  @JsonKey(name: r'stage', required: true, includeIfNull: true)
  final StageDto? stage;

  /// GIT: the practice repository.
  @JsonKey(name: r'repo', required: true, includeIfNull: true)
  final GitSetupDto? repo;

  /// Checks for the browser sandbox (see packages/checks).
  @JsonKey(name: r'checks', required: true, includeIfNull: false)
  final List<Object> checks;

  /// Hint texts by key, in the requested language with English filling gaps.
  @JsonKey(name: r'hints', required: true, includeIfNull: false)
  final Map<String, String> hints;

  /// What each check looks at, by check ID (\"The heading has a colour\"), in the requested language with English filling gaps: the checklist beside the editor.
  @JsonKey(name: r'checkLabels', required: true, includeIfNull: false)
  final Map<String, String> checkLabels;

  /// The student's saved code, if any.
  @JsonKey(name: r'draft', required: true, includeIfNull: true)
  final CodeFilesDto? draft;

  /// Whether the student has passed this challenge before.
  @JsonKey(name: r'passed', required: true, includeIfNull: false)
  final bool passed;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChallengeDto &&
          other.id == id &&
          other.title == title &&
          other.instructions == instructions &&
          other.type == type &&
          other.xp == xp &&
          other.files == files &&
          other.starter == starter &&
          other.stage == stage &&
          other.repo == repo &&
          other.checks == checks &&
          other.hints == hints &&
          other.checkLabels == checkLabels &&
          other.draft == draft &&
          other.passed == passed;

  @override
  int get hashCode =>
      id.hashCode +
      title.hashCode +
      instructions.hashCode +
      type.hashCode +
      xp.hashCode +
      files.hashCode +
      starter.hashCode +
      (stage == null ? 0 : stage.hashCode) +
      (repo == null ? 0 : repo.hashCode) +
      checks.hashCode +
      hints.hashCode +
      checkLabels.hashCode +
      (draft == null ? 0 : draft.hashCode) +
      passed.hashCode;

  factory ChallengeDto.fromJson(Map<String, dynamic> json) =>
      _$ChallengeDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChallengeDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ChallengeDtoTypeEnum {
  @JsonValue(r'HTML')
  HTML(r'HTML'),
  @JsonValue(r'CSS')
  CSS(r'CSS'),
  @JsonValue(r'JS')
  JS(r'JS'),
  @JsonValue(r'PYTHON')
  PYTHON(r'PYTHON'),
  @JsonValue(r'BLOCKS')
  BLOCKS(r'BLOCKS'),
  @JsonValue(r'GIT')
  GIT(r'GIT'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ChallengeDtoTypeEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum ChallengeDtoFilesEnum {
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

  const ChallengeDtoFilesEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
