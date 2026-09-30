// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'leaderboard_entry_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LeaderboardEntryDtoCWProxy {
  LeaderboardEntryDto rank(num rank);

  LeaderboardEntryDto nickname(String nickname);

  LeaderboardEntryDto avatarKey(String avatarKey);

  LeaderboardEntryDto xp(num xp);

  LeaderboardEntryDto isMe(bool isMe);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeaderboardEntryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeaderboardEntryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeaderboardEntryDto call({
    num rank,
    String nickname,
    String avatarKey,
    num xp,
    bool isMe,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLeaderboardEntryDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLeaderboardEntryDto.copyWith.fieldName(...)`
class _$LeaderboardEntryDtoCWProxyImpl implements _$LeaderboardEntryDtoCWProxy {
  const _$LeaderboardEntryDtoCWProxyImpl(this._value);

  final LeaderboardEntryDto _value;

  @override
  LeaderboardEntryDto rank(num rank) => this(rank: rank);

  @override
  LeaderboardEntryDto nickname(String nickname) => this(nickname: nickname);

  @override
  LeaderboardEntryDto avatarKey(String avatarKey) => this(avatarKey: avatarKey);

  @override
  LeaderboardEntryDto xp(num xp) => this(xp: xp);

  @override
  LeaderboardEntryDto isMe(bool isMe) => this(isMe: isMe);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LeaderboardEntryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LeaderboardEntryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LeaderboardEntryDto call({
    Object? rank = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? isMe = const $CopyWithPlaceholder(),
  }) {
    return LeaderboardEntryDto(
      rank: rank == const $CopyWithPlaceholder()
          ? _value.rank
          // ignore: cast_nullable_to_non_nullable
          : rank as num,
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as String,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      isMe: isMe == const $CopyWithPlaceholder()
          ? _value.isMe
          // ignore: cast_nullable_to_non_nullable
          : isMe as bool,
    );
  }
}

extension $LeaderboardEntryDtoCopyWith on LeaderboardEntryDto {
  /// Returns a callable class that can be used as follows: `instanceOfLeaderboardEntryDto.copyWith(...)` or like so:`instanceOfLeaderboardEntryDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LeaderboardEntryDtoCWProxy get copyWith =>
      _$LeaderboardEntryDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LeaderboardEntryDto _$LeaderboardEntryDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LeaderboardEntryDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['rank', 'nickname', 'avatarKey', 'xp', 'isMe'],
      );
      final val = LeaderboardEntryDto(
        rank: $checkedConvert('rank', (v) => v as num),
        nickname: $checkedConvert('nickname', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String),
        xp: $checkedConvert('xp', (v) => v as num),
        isMe: $checkedConvert('isMe', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$LeaderboardEntryDtoToJson(
  LeaderboardEntryDto instance,
) => <String, dynamic>{
  'rank': instance.rank,
  'nickname': instance.nickname,
  'avatarKey': instance.avatarKey,
  'xp': instance.xp,
  'isMe': instance.isMe,
};
