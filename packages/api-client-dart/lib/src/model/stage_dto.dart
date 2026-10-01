//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'stage_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class StageDto {
  /// Returns a new [StageDto] instance.
  StageDto({
    required this.mode,

    required this.map,

    required this.toolbox,

    this.theme,

    this.seconds,
  });

  @JsonKey(
    name: r'mode',
    required: true,
    includeIfNull: false,
    unknownEnumValue: StageDtoModeEnum.unknownDefaultOpenApi,
  )
  final StageDtoModeEnum mode;

  /// Rows, top to bottom: \"#\" wall, \".\" floor, \"S\" start, \"G\" flag, \"*\" gem, \"T\" star.
  @JsonKey(name: r'map', required: true, includeIfNull: false)
  final List<String> map;

  /// The blocks in the toolbox, in order.
  @JsonKey(
    name: r'toolbox',
    required: true,
    includeIfNull: false,
    unknownEnumValue: StageDtoToolboxEnum.unknownDefaultOpenApi,
  )
  final List<StageDtoToolboxEnum> toolbox;

  @JsonKey(
    name: r'theme',
    required: false,
    includeIfNull: false,
    unknownEnumValue: StageDtoThemeEnum.unknownDefaultOpenApi,
  )
  final StageDtoThemeEnum? theme;

  /// Games: seconds per round.
  @JsonKey(name: r'seconds', required: false, includeIfNull: false)
  final num? seconds;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StageDto &&
          other.mode == mode &&
          other.map == map &&
          other.toolbox == toolbox &&
          other.theme == theme &&
          other.seconds == seconds;

  @override
  int get hashCode =>
      mode.hashCode +
      map.hashCode +
      toolbox.hashCode +
      theme.hashCode +
      seconds.hashCode;

  factory StageDto.fromJson(Map<String, dynamic> json) =>
      _$StageDtoFromJson(json);

  Map<String, dynamic> toJson() => _$StageDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum StageDtoModeEnum {
  @JsonValue(r'maze')
  maze(r'maze'),
  @JsonValue(r'game')
  game(r'game'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const StageDtoModeEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum StageDtoToolboxEnum {
  @JsonValue(r'repeat')
  repeat(r'repeat'),
  @JsonValue(r'star')
  star(r'star'),
  @JsonValue(r'when-run')
  whenRun(r'when-run'),
  @JsonValue(r'when-key')
  whenKey(r'when-key'),
  @JsonValue(r'when-star')
  whenStar(r'when-star'),
  @JsonValue(r'move')
  move(r'move'),
  @JsonValue(r'collect')
  collect(r'collect'),
  @JsonValue(r'say')
  say(r'say'),
  @JsonValue(r'until-goal')
  untilGoal(r'until-goal'),
  @JsonValue(r'if')
  if_(r'if'),
  @JsonValue(r'if-else')
  ifElse(r'if-else'),
  @JsonValue(r'score')
  score(r'score'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const StageDtoToolboxEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum StageDtoThemeEnum {
  @JsonValue(r'meadow')
  meadow(r'meadow'),
  @JsonValue(r'space')
  space(r'space'),
  @JsonValue(r'sea')
  sea(r'sea'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const StageDtoThemeEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
