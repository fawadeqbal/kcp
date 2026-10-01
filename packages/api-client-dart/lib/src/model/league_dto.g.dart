// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'league_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LeagueDtoCWProxy {
  LeagueDto tier(LeagueDtoTierEnum tier);

  LeagueDto tierIndex(num tierIndex);

  LeagueDto week(LeagueWeekDto week);

  LeagueDto joined(bool joined);

  LeagueDto standings(List<LeagueStandingDto> standings);

  LeagueDto promoteCount(num promoteCount);

  LeagueDto relegateCount(num relegateCount);

  LeagueDto lastResult(LeagueResultDto? lastResult);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeagueDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeagueDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeagueDto call({
    LeagueDtoTierEnum tier,
    num tierIndex,
    LeagueWeekDto week,
    bool joined,
    List<LeagueStandingDto> standings,
    num promoteCount,
    num relegateCount,
    LeagueResultDto? lastResult,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLeagueDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLeagueDto.copyWith.fieldName(...)`
class _$LeagueDtoCWProxyImpl implements _$LeagueDtoCWProxy {
  const _$LeagueDtoCWProxyImpl(this._value);

  final LeagueDto _value;

  @override
  LeagueDto tier(LeagueDtoTierEnum tier) => this(tier: tier);

  @override
  LeagueDto tierIndex(num tierIndex) => this(tierIndex: tierIndex);

  @override
  LeagueDto week(LeagueWeekDto week) => this(week: week);

  @override
  LeagueDto joined(bool joined) => this(joined: joined);

  @override
  LeagueDto standings(List<LeagueStandingDto> standings) =>
      this(standings: standings);

  @override
  LeagueDto promoteCount(num promoteCount) => this(promoteCount: promoteCount);

  @override
  LeagueDto relegateCount(num relegateCount) =>
      this(relegateCount: relegateCount);

  @override
  LeagueDto lastResult(LeagueResultDto? lastResult) =>
      this(lastResult: lastResult);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeagueDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeagueDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeagueDto call({
    Object? tier = const $CopyWithPlaceholder(),
    Object? tierIndex = const $CopyWithPlaceholder(),
    Object? week = const $CopyWithPlaceholder(),
    Object? joined = const $CopyWithPlaceholder(),
    Object? standings = const $CopyWithPlaceholder(),
    Object? promoteCount = const $CopyWithPlaceholder(),
    Object? relegateCount = const $CopyWithPlaceholder(),
    Object? lastResult = const $CopyWithPlaceholder(),
  }) {
    return LeagueDto(
      tier: tier == const $CopyWithPlaceholder()
          ? _value.tier
          // ignore: cast_nullable_to_non_nullable
          : tier as LeagueDtoTierEnum,
      tierIndex: tierIndex == const $CopyWithPlaceholder()
          ? _value.tierIndex
          // ignore: cast_nullable_to_non_nullable
          : tierIndex as num,
      week: week == const $CopyWithPlaceholder()
          ? _value.week
          // ignore: cast_nullable_to_non_nullable
          : week as LeagueWeekDto,
      joined: joined == const $CopyWithPlaceholder()
          ? _value.joined
          // ignore: cast_nullable_to_non_nullable
          : joined as bool,
      standings: standings == const $CopyWithPlaceholder()
          ? _value.standings
          // ignore: cast_nullable_to_non_nullable
          : standings as List<LeagueStandingDto>,
      promoteCount: promoteCount == const $CopyWithPlaceholder()
          ? _value.promoteCount
          // ignore: cast_nullable_to_non_nullable
          : promoteCount as num,
      relegateCount: relegateCount == const $CopyWithPlaceholder()
          ? _value.relegateCount
          // ignore: cast_nullable_to_non_nullable
          : relegateCount as num,
      lastResult: lastResult == const $CopyWithPlaceholder()
          ? _value.lastResult
          // ignore: cast_nullable_to_non_nullable
          : lastResult as LeagueResultDto?,
    );
  }
}

extension $LeagueDtoCopyWith on LeagueDto {
  /// Returns a callable class that can be used as follows: `instanceOfLeagueDto.copyWith(...)` or like so:`instanceOfLeagueDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LeagueDtoCWProxy get copyWith => _$LeagueDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LeagueDto _$LeagueDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LeagueDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'tier',
          'tierIndex',
          'week',
          'joined',
          'standings',
          'promoteCount',
          'relegateCount',
          'lastResult',
        ],
      );
      final val = LeagueDto(
        tier: $checkedConvert(
          'tier',
          (v) => $enumDecode(
            _$LeagueDtoTierEnumEnumMap,
            v,
            unknownValue: LeagueDtoTierEnum.unknownDefaultOpenApi,
          ),
        ),
        tierIndex: $checkedConvert('tierIndex', (v) => v as num),
        week: $checkedConvert(
          'week',
          (v) => LeagueWeekDto.fromJson(v as Map<String, dynamic>),
        ),
        joined: $checkedConvert('joined', (v) => v as bool),
        standings: $checkedConvert(
          'standings',
          (v) => (v as List<dynamic>)
              .map((e) => LeagueStandingDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        promoteCount: $checkedConvert('promoteCount', (v) => v as num),
        relegateCount: $checkedConvert('relegateCount', (v) => v as num),
        lastResult: $checkedConvert(
          'lastResult',
          (v) => v == null
              ? null
              : LeagueResultDto.fromJson(v as Map<String, dynamic>),
        ),
      );
      return val;
    });

Map<String, dynamic> _$LeagueDtoToJson(LeagueDto instance) => <String, dynamic>{
  'tier': _$LeagueDtoTierEnumEnumMap[instance.tier]!,
  'tierIndex': instance.tierIndex,
  'week': instance.week.toJson(),
  'joined': instance.joined,
  'standings': instance.standings.map((e) => e.toJson()).toList(),
  'promoteCount': instance.promoteCount,
  'relegateCount': instance.relegateCount,
  'lastResult': instance.lastResult?.toJson(),
};

const _$LeagueDtoTierEnumEnumMap = {
  LeagueDtoTierEnum.bronze: 'bronze',
  LeagueDtoTierEnum.silver: 'silver',
  LeagueDtoTierEnum.gold: 'gold',
  LeagueDtoTierEnum.sapphire: 'sapphire',
  LeagueDtoTierEnum.ruby: 'ruby',
  LeagueDtoTierEnum.emerald: 'emerald',
  LeagueDtoTierEnum.diamond: 'diamond',
  LeagueDtoTierEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
