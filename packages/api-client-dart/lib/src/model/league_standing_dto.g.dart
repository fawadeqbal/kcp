// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'league_standing_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LeagueStandingDtoCWProxy {
  LeagueStandingDto zone(LeagueStandingDtoZoneEnum? zone);

  LeagueStandingDto rank(num rank);

  LeagueStandingDto nickname(String? nickname);

  LeagueStandingDto avatarKey(String? avatarKey);

  LeagueStandingDto xp(num xp);

  LeagueStandingDto isMe(bool isMe);

  LeagueStandingDto isFriend(bool isFriend);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeagueStandingDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeagueStandingDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeagueStandingDto call({
    LeagueStandingDtoZoneEnum? zone,
    num rank,
    String? nickname,
    String? avatarKey,
    num xp,
    bool isMe,
    bool isFriend,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLeagueStandingDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLeagueStandingDto.copyWith.fieldName(...)`
class _$LeagueStandingDtoCWProxyImpl implements _$LeagueStandingDtoCWProxy {
  const _$LeagueStandingDtoCWProxyImpl(this._value);

  final LeagueStandingDto _value;

  @override
  LeagueStandingDto zone(LeagueStandingDtoZoneEnum? zone) => this(zone: zone);

  @override
  LeagueStandingDto rank(num rank) => this(rank: rank);

  @override
  LeagueStandingDto nickname(String? nickname) => this(nickname: nickname);

  @override
  LeagueStandingDto avatarKey(String? avatarKey) => this(avatarKey: avatarKey);

  @override
  LeagueStandingDto xp(num xp) => this(xp: xp);

  @override
  LeagueStandingDto isMe(bool isMe) => this(isMe: isMe);

  @override
  LeagueStandingDto isFriend(bool isFriend) => this(isFriend: isFriend);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeagueStandingDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeagueStandingDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeagueStandingDto call({
    Object? zone = const $CopyWithPlaceholder(),
    Object? rank = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? isMe = const $CopyWithPlaceholder(),
    Object? isFriend = const $CopyWithPlaceholder(),
  }) {
    return LeagueStandingDto(
      zone: zone == const $CopyWithPlaceholder()
          ? _value.zone
          // ignore: cast_nullable_to_non_nullable
          : zone as LeagueStandingDtoZoneEnum?,
      rank: rank == const $CopyWithPlaceholder()
          ? _value.rank
          // ignore: cast_nullable_to_non_nullable
          : rank as num,
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String?,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as String?,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      isMe: isMe == const $CopyWithPlaceholder()
          ? _value.isMe
          // ignore: cast_nullable_to_non_nullable
          : isMe as bool,
      isFriend: isFriend == const $CopyWithPlaceholder()
          ? _value.isFriend
          // ignore: cast_nullable_to_non_nullable
          : isFriend as bool,
    );
  }
}

extension $LeagueStandingDtoCopyWith on LeagueStandingDto {
  /// Returns a callable class that can be used as follows: `instanceOfLeagueStandingDto.copyWith(...)` or like so:`instanceOfLeagueStandingDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LeagueStandingDtoCWProxy get copyWith =>
      _$LeagueStandingDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LeagueStandingDto _$LeagueStandingDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LeagueStandingDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'zone',
          'rank',
          'nickname',
          'avatarKey',
          'xp',
          'isMe',
          'isFriend',
        ],
      );
      final val = LeagueStandingDto(
        zone: $checkedConvert(
          'zone',
          (v) => $enumDecodeNullable(
            _$LeagueStandingDtoZoneEnumEnumMap,
            v,
            unknownValue: LeagueStandingDtoZoneEnum.unknownDefaultOpenApi,
          ),
        ),
        rank: $checkedConvert('rank', (v) => v as num),
        nickname: $checkedConvert('nickname', (v) => v as String?),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String?),
        xp: $checkedConvert('xp', (v) => v as num),
        isMe: $checkedConvert('isMe', (v) => v as bool),
        isFriend: $checkedConvert('isFriend', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$LeagueStandingDtoToJson(LeagueStandingDto instance) =>
    <String, dynamic>{
      'zone': _$LeagueStandingDtoZoneEnumEnumMap[instance.zone],
      'rank': instance.rank,
      'nickname': instance.nickname,
      'avatarKey': instance.avatarKey,
      'xp': instance.xp,
      'isMe': instance.isMe,
      'isFriend': instance.isFriend,
    };

const _$LeagueStandingDtoZoneEnumEnumMap = {
  LeagueStandingDtoZoneEnum.up: 'up',
  LeagueStandingDtoZoneEnum.down: 'down',
  LeagueStandingDtoZoneEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
