// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'league_week_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LeagueWeekDtoCWProxy {
  LeagueWeekDto key(String key);

  LeagueWeekDto startDay(String startDay);

  LeagueWeekDto endDay(String endDay);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeagueWeekDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeagueWeekDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeagueWeekDto call({String key, String startDay, String endDay});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLeagueWeekDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLeagueWeekDto.copyWith.fieldName(...)`
class _$LeagueWeekDtoCWProxyImpl implements _$LeagueWeekDtoCWProxy {
  const _$LeagueWeekDtoCWProxyImpl(this._value);

  final LeagueWeekDto _value;

  @override
  LeagueWeekDto key(String key) => this(key: key);

  @override
  LeagueWeekDto startDay(String startDay) => this(startDay: startDay);

  @override
  LeagueWeekDto endDay(String endDay) => this(endDay: endDay);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeagueWeekDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeagueWeekDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeagueWeekDto call({
    Object? key = const $CopyWithPlaceholder(),
    Object? startDay = const $CopyWithPlaceholder(),
    Object? endDay = const $CopyWithPlaceholder(),
  }) {
    return LeagueWeekDto(
      key: key == const $CopyWithPlaceholder()
          ? _value.key
          // ignore: cast_nullable_to_non_nullable
          : key as String,
      startDay: startDay == const $CopyWithPlaceholder()
          ? _value.startDay
          // ignore: cast_nullable_to_non_nullable
          : startDay as String,
      endDay: endDay == const $CopyWithPlaceholder()
          ? _value.endDay
          // ignore: cast_nullable_to_non_nullable
          : endDay as String,
    );
  }
}

extension $LeagueWeekDtoCopyWith on LeagueWeekDto {
  /// Returns a callable class that can be used as follows: `instanceOfLeagueWeekDto.copyWith(...)` or like so:`instanceOfLeagueWeekDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LeagueWeekDtoCWProxy get copyWith => _$LeagueWeekDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LeagueWeekDto _$LeagueWeekDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LeagueWeekDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['key', 'startDay', 'endDay']);
      final val = LeagueWeekDto(
        key: $checkedConvert('key', (v) => v as String),
        startDay: $checkedConvert('startDay', (v) => v as String),
        endDay: $checkedConvert('endDay', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$LeagueWeekDtoToJson(LeagueWeekDto instance) =>
    <String, dynamic>{
      'key': instance.key,
      'startDay': instance.startDay,
      'endDay': instance.endDay,
    };
