// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'stage_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$StageDtoCWProxy {
  StageDto mode(StageDtoModeEnum mode);

  StageDto map(List<String> map);

  StageDto toolbox(List<StageDtoToolboxEnum> toolbox);

  StageDto theme(StageDtoThemeEnum? theme);

  StageDto seconds(num? seconds);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StageDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StageDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StageDto call({
    StageDtoModeEnum mode,
    List<String> map,
    List<StageDtoToolboxEnum> toolbox,
    StageDtoThemeEnum? theme,
    num? seconds,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfStageDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfStageDto.copyWith.fieldName(...)`
class _$StageDtoCWProxyImpl implements _$StageDtoCWProxy {
  const _$StageDtoCWProxyImpl(this._value);

  final StageDto _value;

  @override
  StageDto mode(StageDtoModeEnum mode) => this(mode: mode);

  @override
  StageDto map(List<String> map) => this(map: map);

  @override
  StageDto toolbox(List<StageDtoToolboxEnum> toolbox) => this(toolbox: toolbox);

  @override
  StageDto theme(StageDtoThemeEnum? theme) => this(theme: theme);

  @override
  StageDto seconds(num? seconds) => this(seconds: seconds);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StageDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StageDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StageDto call({
    Object? mode = const $CopyWithPlaceholder(),
    Object? map = const $CopyWithPlaceholder(),
    Object? toolbox = const $CopyWithPlaceholder(),
    Object? theme = const $CopyWithPlaceholder(),
    Object? seconds = const $CopyWithPlaceholder(),
  }) {
    return StageDto(
      mode: mode == const $CopyWithPlaceholder()
          ? _value.mode
          // ignore: cast_nullable_to_non_nullable
          : mode as StageDtoModeEnum,
      map: map == const $CopyWithPlaceholder()
          ? _value.map
          // ignore: cast_nullable_to_non_nullable
          : map as List<String>,
      toolbox: toolbox == const $CopyWithPlaceholder()
          ? _value.toolbox
          // ignore: cast_nullable_to_non_nullable
          : toolbox as List<StageDtoToolboxEnum>,
      theme: theme == const $CopyWithPlaceholder()
          ? _value.theme
          // ignore: cast_nullable_to_non_nullable
          : theme as StageDtoThemeEnum?,
      seconds: seconds == const $CopyWithPlaceholder()
          ? _value.seconds
          // ignore: cast_nullable_to_non_nullable
          : seconds as num?,
    );
  }
}

extension $StageDtoCopyWith on StageDto {
  /// Returns a callable class that can be used as follows: `instanceOfStageDto.copyWith(...)` or like so:`instanceOfStageDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$StageDtoCWProxy get copyWith => _$StageDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

StageDto _$StageDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('StageDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['mode', 'map', 'toolbox']);
      final val = StageDto(
        mode: $checkedConvert(
          'mode',
          (v) => $enumDecode(
            _$StageDtoModeEnumEnumMap,
            v,
            unknownValue: StageDtoModeEnum.unknownDefaultOpenApi,
          ),
        ),
        map: $checkedConvert(
          'map',
          (v) => (v as List<dynamic>).map((e) => e as String).toList(),
        ),
        toolbox: $checkedConvert(
          'toolbox',
          (v) => (v as List<dynamic>)
              .map(
                (e) => $enumDecode(
                  _$StageDtoToolboxEnumEnumMap,
                  e,
                  unknownValue: StageDtoToolboxEnum.unknownDefaultOpenApi,
                ),
              )
              .toList(),
        ),
        theme: $checkedConvert(
          'theme',
          (v) => $enumDecodeNullable(
            _$StageDtoThemeEnumEnumMap,
            v,
            unknownValue: StageDtoThemeEnum.unknownDefaultOpenApi,
          ),
        ),
        seconds: $checkedConvert('seconds', (v) => v as num?),
      );
      return val;
    });

Map<String, dynamic> _$StageDtoToJson(StageDto instance) => <String, dynamic>{
  'mode': _$StageDtoModeEnumEnumMap[instance.mode]!,
  'map': instance.map,
  'toolbox': instance.toolbox
      .map((e) => _$StageDtoToolboxEnumEnumMap[e]!)
      .toList(),
  'theme': ?_$StageDtoThemeEnumEnumMap[instance.theme],
  'seconds': ?instance.seconds,
};

const _$StageDtoModeEnumEnumMap = {
  StageDtoModeEnum.maze: 'maze',
  StageDtoModeEnum.game: 'game',
  StageDtoModeEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$StageDtoToolboxEnumEnumMap = {
  StageDtoToolboxEnum.repeat: 'repeat',
  StageDtoToolboxEnum.star: 'star',
  StageDtoToolboxEnum.whenRun: 'when-run',
  StageDtoToolboxEnum.whenKey: 'when-key',
  StageDtoToolboxEnum.whenStar: 'when-star',
  StageDtoToolboxEnum.move: 'move',
  StageDtoToolboxEnum.collect: 'collect',
  StageDtoToolboxEnum.say: 'say',
  StageDtoToolboxEnum.untilGoal: 'until-goal',
  StageDtoToolboxEnum.if_: 'if',
  StageDtoToolboxEnum.ifElse: 'if-else',
  StageDtoToolboxEnum.score: 'score',
  StageDtoToolboxEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$StageDtoThemeEnumEnumMap = {
  StageDtoThemeEnum.meadow: 'meadow',
  StageDtoThemeEnum.space: 'space',
  StageDtoThemeEnum.sea: 'sea',
  StageDtoThemeEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
