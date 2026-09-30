// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'leaderboard_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LeaderboardDtoCWProxy {
  LeaderboardDto scope(LeaderboardDtoScopeEnum scope);

  LeaderboardDto period(LeaderboardDtoPeriodEnum period);

  LeaderboardDto countryCode(String? countryCode);

  LeaderboardDto areaName(String? areaName);

  LeaderboardDto available(bool available);

  LeaderboardDto minStudents(num minStudents);

  LeaderboardDto week(BoardWeekDto? week);

  LeaderboardDto season(SeasonDto? season);

  LeaderboardDto entries(List<LeaderboardEntryDto> entries);

  LeaderboardDto me(LeaderboardDtoMe me);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeaderboardDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeaderboardDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeaderboardDto call({
    LeaderboardDtoScopeEnum scope,
    LeaderboardDtoPeriodEnum period,
    String? countryCode,
    String? areaName,
    bool available,
    num minStudents,
    BoardWeekDto? week,
    SeasonDto? season,
    List<LeaderboardEntryDto> entries,
    LeaderboardDtoMe me,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLeaderboardDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLeaderboardDto.copyWith.fieldName(...)`
class _$LeaderboardDtoCWProxyImpl implements _$LeaderboardDtoCWProxy {
  const _$LeaderboardDtoCWProxyImpl(this._value);

  final LeaderboardDto _value;

  @override
  LeaderboardDto scope(LeaderboardDtoScopeEnum scope) => this(scope: scope);

  @override
  LeaderboardDto period(LeaderboardDtoPeriodEnum period) =>
      this(period: period);

  @override
  LeaderboardDto countryCode(String? countryCode) =>
      this(countryCode: countryCode);

  @override
  LeaderboardDto areaName(String? areaName) => this(areaName: areaName);

  @override
  LeaderboardDto available(bool available) => this(available: available);

  @override
  LeaderboardDto minStudents(num minStudents) => this(minStudents: minStudents);

  @override
  LeaderboardDto week(BoardWeekDto? week) => this(week: week);

  @override
  LeaderboardDto season(SeasonDto? season) => this(season: season);

  @override
  LeaderboardDto entries(List<LeaderboardEntryDto> entries) =>
      this(entries: entries);

  @override
  LeaderboardDto me(LeaderboardDtoMe me) => this(me: me);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeaderboardDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeaderboardDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeaderboardDto call({
    Object? scope = const $CopyWithPlaceholder(),
    Object? period = const $CopyWithPlaceholder(),
    Object? countryCode = const $CopyWithPlaceholder(),
    Object? areaName = const $CopyWithPlaceholder(),
    Object? available = const $CopyWithPlaceholder(),
    Object? minStudents = const $CopyWithPlaceholder(),
    Object? week = const $CopyWithPlaceholder(),
    Object? season = const $CopyWithPlaceholder(),
    Object? entries = const $CopyWithPlaceholder(),
    Object? me = const $CopyWithPlaceholder(),
  }) {
    return LeaderboardDto(
      scope: scope == const $CopyWithPlaceholder()
          ? _value.scope
          // ignore: cast_nullable_to_non_nullable
          : scope as LeaderboardDtoScopeEnum,
      period: period == const $CopyWithPlaceholder()
          ? _value.period
          // ignore: cast_nullable_to_non_nullable
          : period as LeaderboardDtoPeriodEnum,
      countryCode: countryCode == const $CopyWithPlaceholder()
          ? _value.countryCode
          // ignore: cast_nullable_to_non_nullable
          : countryCode as String?,
      areaName: areaName == const $CopyWithPlaceholder()
          ? _value.areaName
          // ignore: cast_nullable_to_non_nullable
          : areaName as String?,
      available: available == const $CopyWithPlaceholder()
          ? _value.available
          // ignore: cast_nullable_to_non_nullable
          : available as bool,
      minStudents: minStudents == const $CopyWithPlaceholder()
          ? _value.minStudents
          // ignore: cast_nullable_to_non_nullable
          : minStudents as num,
      week: week == const $CopyWithPlaceholder()
          ? _value.week
          // ignore: cast_nullable_to_non_nullable
          : week as BoardWeekDto?,
      season: season == const $CopyWithPlaceholder()
          ? _value.season
          // ignore: cast_nullable_to_non_nullable
          : season as SeasonDto?,
      entries: entries == const $CopyWithPlaceholder()
          ? _value.entries
          // ignore: cast_nullable_to_non_nullable
          : entries as List<LeaderboardEntryDto>,
      me: me == const $CopyWithPlaceholder()
          ? _value.me
          // ignore: cast_nullable_to_non_nullable
          : me as LeaderboardDtoMe,
    );
  }
}

extension $LeaderboardDtoCopyWith on LeaderboardDto {
  /// Returns a callable class that can be used as follows: `instanceOfLeaderboardDto.copyWith(...)` or like so:`instanceOfLeaderboardDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LeaderboardDtoCWProxy get copyWith => _$LeaderboardDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LeaderboardDto _$LeaderboardDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('LeaderboardDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'scope',
      'period',
      'countryCode',
      'areaName',
      'available',
      'minStudents',
      'week',
      'season',
      'entries',
      'me',
    ],
  );
  final val = LeaderboardDto(
    scope: $checkedConvert(
      'scope',
      (v) => $enumDecode(
        _$LeaderboardDtoScopeEnumEnumMap,
        v,
        unknownValue: LeaderboardDtoScopeEnum.unknownDefaultOpenApi,
      ),
    ),
    period: $checkedConvert(
      'period',
      (v) => $enumDecode(
        _$LeaderboardDtoPeriodEnumEnumMap,
        v,
        unknownValue: LeaderboardDtoPeriodEnum.unknownDefaultOpenApi,
      ),
    ),
    countryCode: $checkedConvert('countryCode', (v) => v as String?),
    areaName: $checkedConvert('areaName', (v) => v as String?),
    available: $checkedConvert('available', (v) => v as bool),
    minStudents: $checkedConvert('minStudents', (v) => v as num),
    week: $checkedConvert(
      'week',
      (v) =>
          v == null ? null : BoardWeekDto.fromJson(v as Map<String, dynamic>),
    ),
    season: $checkedConvert(
      'season',
      (v) => v == null ? null : SeasonDto.fromJson(v as Map<String, dynamic>),
    ),
    entries: $checkedConvert(
      'entries',
      (v) => (v as List<dynamic>)
          .map((e) => LeaderboardEntryDto.fromJson(e as Map<String, dynamic>))
          .toList(),
    ),
    me: $checkedConvert(
      'me',
      (v) => LeaderboardDtoMe.fromJson(v as Map<String, dynamic>),
    ),
  );
  return val;
});

Map<String, dynamic> _$LeaderboardDtoToJson(LeaderboardDto instance) =>
    <String, dynamic>{
      'scope': _$LeaderboardDtoScopeEnumEnumMap[instance.scope]!,
      'period': _$LeaderboardDtoPeriodEnumEnumMap[instance.period]!,
      'countryCode': instance.countryCode,
      'areaName': instance.areaName,
      'available': instance.available,
      'minStudents': instance.minStudents,
      'week': instance.week?.toJson(),
      'season': instance.season?.toJson(),
      'entries': instance.entries.map((e) => e.toJson()).toList(),
      'me': instance.me.toJson(),
    };

const _$LeaderboardDtoScopeEnumEnumMap = {
  LeaderboardDtoScopeEnum.country: 'country',
  LeaderboardDtoScopeEnum.region: 'region',
  LeaderboardDtoScopeEnum.city: 'city',
  LeaderboardDtoScopeEnum.global: 'global',
  LeaderboardDtoScopeEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$LeaderboardDtoPeriodEnumEnumMap = {
  LeaderboardDtoPeriodEnum.all: 'all',
  LeaderboardDtoPeriodEnum.week: 'week',
  LeaderboardDtoPeriodEnum.season: 'season',
  LeaderboardDtoPeriodEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
