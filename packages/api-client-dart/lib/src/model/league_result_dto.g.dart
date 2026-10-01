// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'league_result_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LeagueResultDtoCWProxy {
  LeagueResultDto tier(LeagueResultDtoTierEnum tier);

  LeagueResultDto outcome(LeagueResultDtoOutcomeEnum outcome);

  LeagueResultDto newTier(LeagueResultDtoNewTierEnum newTier);

  LeagueResultDto weekKey(String weekKey);

  LeagueResultDto rank(num rank);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeagueResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeagueResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeagueResultDto call({
    LeagueResultDtoTierEnum tier,
    LeagueResultDtoOutcomeEnum outcome,
    LeagueResultDtoNewTierEnum newTier,
    String weekKey,
    num rank,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLeagueResultDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLeagueResultDto.copyWith.fieldName(...)`
class _$LeagueResultDtoCWProxyImpl implements _$LeagueResultDtoCWProxy {
  const _$LeagueResultDtoCWProxyImpl(this._value);

  final LeagueResultDto _value;

  @override
  LeagueResultDto tier(LeagueResultDtoTierEnum tier) => this(tier: tier);

  @override
  LeagueResultDto outcome(LeagueResultDtoOutcomeEnum outcome) =>
      this(outcome: outcome);

  @override
  LeagueResultDto newTier(LeagueResultDtoNewTierEnum newTier) =>
      this(newTier: newTier);

  @override
  LeagueResultDto weekKey(String weekKey) => this(weekKey: weekKey);

  @override
  LeagueResultDto rank(num rank) => this(rank: rank);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeagueResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeagueResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeagueResultDto call({
    Object? tier = const $CopyWithPlaceholder(),
    Object? outcome = const $CopyWithPlaceholder(),
    Object? newTier = const $CopyWithPlaceholder(),
    Object? weekKey = const $CopyWithPlaceholder(),
    Object? rank = const $CopyWithPlaceholder(),
  }) {
    return LeagueResultDto(
      tier: tier == const $CopyWithPlaceholder()
          ? _value.tier
          // ignore: cast_nullable_to_non_nullable
          : tier as LeagueResultDtoTierEnum,
      outcome: outcome == const $CopyWithPlaceholder()
          ? _value.outcome
          // ignore: cast_nullable_to_non_nullable
          : outcome as LeagueResultDtoOutcomeEnum,
      newTier: newTier == const $CopyWithPlaceholder()
          ? _value.newTier
          // ignore: cast_nullable_to_non_nullable
          : newTier as LeagueResultDtoNewTierEnum,
      weekKey: weekKey == const $CopyWithPlaceholder()
          ? _value.weekKey
          // ignore: cast_nullable_to_non_nullable
          : weekKey as String,
      rank: rank == const $CopyWithPlaceholder()
          ? _value.rank
          // ignore: cast_nullable_to_non_nullable
          : rank as num,
    );
  }
}

extension $LeagueResultDtoCopyWith on LeagueResultDto {
  /// Returns a callable class that can be used as follows: `instanceOfLeagueResultDto.copyWith(...)` or like so:`instanceOfLeagueResultDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LeagueResultDtoCWProxy get copyWith => _$LeagueResultDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LeagueResultDto _$LeagueResultDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LeagueResultDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['tier', 'outcome', 'newTier', 'weekKey', 'rank'],
      );
      final val = LeagueResultDto(
        tier: $checkedConvert(
          'tier',
          (v) => $enumDecode(
            _$LeagueResultDtoTierEnumEnumMap,
            v,
            unknownValue: LeagueResultDtoTierEnum.unknownDefaultOpenApi,
          ),
        ),
        outcome: $checkedConvert(
          'outcome',
          (v) => $enumDecode(
            _$LeagueResultDtoOutcomeEnumEnumMap,
            v,
            unknownValue: LeagueResultDtoOutcomeEnum.unknownDefaultOpenApi,
          ),
        ),
        newTier: $checkedConvert(
          'newTier',
          (v) => $enumDecode(
            _$LeagueResultDtoNewTierEnumEnumMap,
            v,
            unknownValue: LeagueResultDtoNewTierEnum.unknownDefaultOpenApi,
          ),
        ),
        weekKey: $checkedConvert('weekKey', (v) => v as String),
        rank: $checkedConvert('rank', (v) => v as num),
      );
      return val;
    });

Map<String, dynamic> _$LeagueResultDtoToJson(LeagueResultDto instance) =>
    <String, dynamic>{
      'tier': _$LeagueResultDtoTierEnumEnumMap[instance.tier]!,
      'outcome': _$LeagueResultDtoOutcomeEnumEnumMap[instance.outcome]!,
      'newTier': _$LeagueResultDtoNewTierEnumEnumMap[instance.newTier]!,
      'weekKey': instance.weekKey,
      'rank': instance.rank,
    };

const _$LeagueResultDtoTierEnumEnumMap = {
  LeagueResultDtoTierEnum.bronze: 'bronze',
  LeagueResultDtoTierEnum.silver: 'silver',
  LeagueResultDtoTierEnum.gold: 'gold',
  LeagueResultDtoTierEnum.sapphire: 'sapphire',
  LeagueResultDtoTierEnum.ruby: 'ruby',
  LeagueResultDtoTierEnum.emerald: 'emerald',
  LeagueResultDtoTierEnum.diamond: 'diamond',
  LeagueResultDtoTierEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$LeagueResultDtoOutcomeEnumEnumMap = {
  LeagueResultDtoOutcomeEnum.PROMOTED: 'PROMOTED',
  LeagueResultDtoOutcomeEnum.STAYED: 'STAYED',
  LeagueResultDtoOutcomeEnum.RELEGATED: 'RELEGATED',
  LeagueResultDtoOutcomeEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$LeagueResultDtoNewTierEnumEnumMap = {
  LeagueResultDtoNewTierEnum.bronze: 'bronze',
  LeagueResultDtoNewTierEnum.silver: 'silver',
  LeagueResultDtoNewTierEnum.gold: 'gold',
  LeagueResultDtoNewTierEnum.sapphire: 'sapphire',
  LeagueResultDtoNewTierEnum.ruby: 'ruby',
  LeagueResultDtoNewTierEnum.emerald: 'emerald',
  LeagueResultDtoNewTierEnum.diamond: 'diamond',
  LeagueResultDtoNewTierEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
