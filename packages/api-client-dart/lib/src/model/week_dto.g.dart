// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'week_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$WeekDtoCWProxy {
  WeekDto key(String key);

  WeekDto startDay(String startDay);

  WeekDto endDay(String endDay);

  WeekDto xp(num xp);

  WeekDto hidden(bool hidden);

  WeekDto globalRank(num? globalRank);

  WeekDto countryRank(num? countryRank);

  WeekDto regionRank(num? regionRank);

  WeekDto cityRank(num? cityRank);

  WeekDto countryCode(String? countryCode);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `WeekDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// WeekDto(...).copyWith(id: 12, name: "My name")
  /// ````
  WeekDto call({
    String key,
    String startDay,
    String endDay,
    num xp,
    bool hidden,
    num? globalRank,
    num? countryRank,
    num? regionRank,
    num? cityRank,
    String? countryCode,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfWeekDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfWeekDto.copyWith.fieldName(...)`
class _$WeekDtoCWProxyImpl implements _$WeekDtoCWProxy {
  const _$WeekDtoCWProxyImpl(this._value);

  final WeekDto _value;

  @override
  WeekDto key(String key) => this(key: key);

  @override
  WeekDto startDay(String startDay) => this(startDay: startDay);

  @override
  WeekDto endDay(String endDay) => this(endDay: endDay);

  @override
  WeekDto xp(num xp) => this(xp: xp);

  @override
  WeekDto hidden(bool hidden) => this(hidden: hidden);

  @override
  WeekDto globalRank(num? globalRank) => this(globalRank: globalRank);

  @override
  WeekDto countryRank(num? countryRank) => this(countryRank: countryRank);

  @override
  WeekDto regionRank(num? regionRank) => this(regionRank: regionRank);

  @override
  WeekDto cityRank(num? cityRank) => this(cityRank: cityRank);

  @override
  WeekDto countryCode(String? countryCode) => this(countryCode: countryCode);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `WeekDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// WeekDto(...).copyWith(id: 12, name: "My name")
  /// ````
  WeekDto call({
    Object? key = const $CopyWithPlaceholder(),
    Object? startDay = const $CopyWithPlaceholder(),
    Object? endDay = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? hidden = const $CopyWithPlaceholder(),
    Object? globalRank = const $CopyWithPlaceholder(),
    Object? countryRank = const $CopyWithPlaceholder(),
    Object? regionRank = const $CopyWithPlaceholder(),
    Object? cityRank = const $CopyWithPlaceholder(),
    Object? countryCode = const $CopyWithPlaceholder(),
  }) {
    return WeekDto(
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
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      hidden: hidden == const $CopyWithPlaceholder()
          ? _value.hidden
          // ignore: cast_nullable_to_non_nullable
          : hidden as bool,
      globalRank: globalRank == const $CopyWithPlaceholder()
          ? _value.globalRank
          // ignore: cast_nullable_to_non_nullable
          : globalRank as num?,
      countryRank: countryRank == const $CopyWithPlaceholder()
          ? _value.countryRank
          // ignore: cast_nullable_to_non_nullable
          : countryRank as num?,
      regionRank: regionRank == const $CopyWithPlaceholder()
          ? _value.regionRank
          // ignore: cast_nullable_to_non_nullable
          : regionRank as num?,
      cityRank: cityRank == const $CopyWithPlaceholder()
          ? _value.cityRank
          // ignore: cast_nullable_to_non_nullable
          : cityRank as num?,
      countryCode: countryCode == const $CopyWithPlaceholder()
          ? _value.countryCode
          // ignore: cast_nullable_to_non_nullable
          : countryCode as String?,
    );
  }
}

extension $WeekDtoCopyWith on WeekDto {
  /// Returns a callable class that can be used as follows: `instanceOfWeekDto.copyWith(...)` or like so:`instanceOfWeekDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$WeekDtoCWProxy get copyWith => _$WeekDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

WeekDto _$WeekDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('WeekDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'key',
          'startDay',
          'endDay',
          'xp',
          'hidden',
          'globalRank',
          'countryRank',
          'regionRank',
          'cityRank',
          'countryCode',
        ],
      );
      final val = WeekDto(
        key: $checkedConvert('key', (v) => v as String),
        startDay: $checkedConvert('startDay', (v) => v as String),
        endDay: $checkedConvert('endDay', (v) => v as String),
        xp: $checkedConvert('xp', (v) => v as num),
        hidden: $checkedConvert('hidden', (v) => v as bool),
        globalRank: $checkedConvert('globalRank', (v) => v as num?),
        countryRank: $checkedConvert('countryRank', (v) => v as num?),
        regionRank: $checkedConvert('regionRank', (v) => v as num?),
        cityRank: $checkedConvert('cityRank', (v) => v as num?),
        countryCode: $checkedConvert('countryCode', (v) => v as String?),
      );
      return val;
    });

Map<String, dynamic> _$WeekDtoToJson(WeekDto instance) => <String, dynamic>{
  'key': instance.key,
  'startDay': instance.startDay,
  'endDay': instance.endDay,
  'xp': instance.xp,
  'hidden': instance.hidden,
  'globalRank': instance.globalRank,
  'countryRank': instance.countryRank,
  'regionRank': instance.regionRank,
  'cityRank': instance.cityRank,
  'countryCode': instance.countryCode,
};
