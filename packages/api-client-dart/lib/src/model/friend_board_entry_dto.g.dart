// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friend_board_entry_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FriendBoardEntryDtoCWProxy {
  FriendBoardEntryDto rank(num rank);

  FriendBoardEntryDto userId(String userId);

  FriendBoardEntryDto nickname(String nickname);

  FriendBoardEntryDto avatarKey(String avatarKey);

  FriendBoardEntryDto xp(num xp);

  FriendBoardEntryDto isMe(bool isMe);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendBoardEntryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendBoardEntryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendBoardEntryDto call({
    num rank,
    String userId,
    String nickname,
    String avatarKey,
    num xp,
    bool isMe,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFriendBoardEntryDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFriendBoardEntryDto.copyWith.fieldName(...)`
class _$FriendBoardEntryDtoCWProxyImpl implements _$FriendBoardEntryDtoCWProxy {
  const _$FriendBoardEntryDtoCWProxyImpl(this._value);

  final FriendBoardEntryDto _value;

  @override
  FriendBoardEntryDto rank(num rank) => this(rank: rank);

  @override
  FriendBoardEntryDto userId(String userId) => this(userId: userId);

  @override
  FriendBoardEntryDto nickname(String nickname) => this(nickname: nickname);

  @override
  FriendBoardEntryDto avatarKey(String avatarKey) => this(avatarKey: avatarKey);

  @override
  FriendBoardEntryDto xp(num xp) => this(xp: xp);

  @override
  FriendBoardEntryDto isMe(bool isMe) => this(isMe: isMe);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendBoardEntryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendBoardEntryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendBoardEntryDto call({
    Object? rank = const $CopyWithPlaceholder(),
    Object? userId = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? isMe = const $CopyWithPlaceholder(),
  }) {
    return FriendBoardEntryDto(
      rank: rank == const $CopyWithPlaceholder()
          ? _value.rank
          // ignore: cast_nullable_to_non_nullable
          : rank as num,
      userId: userId == const $CopyWithPlaceholder()
          ? _value.userId
          // ignore: cast_nullable_to_non_nullable
          : userId as String,
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

extension $FriendBoardEntryDtoCopyWith on FriendBoardEntryDto {
  /// Returns a callable class that can be used as follows: `instanceOfFriendBoardEntryDto.copyWith(...)` or like so:`instanceOfFriendBoardEntryDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FriendBoardEntryDtoCWProxy get copyWith =>
      _$FriendBoardEntryDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FriendBoardEntryDto _$FriendBoardEntryDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FriendBoardEntryDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'rank',
          'userId',
          'nickname',
          'avatarKey',
          'xp',
          'isMe',
        ],
      );
      final val = FriendBoardEntryDto(
        rank: $checkedConvert('rank', (v) => v as num),
        userId: $checkedConvert('userId', (v) => v as String),
        nickname: $checkedConvert('nickname', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String),
        xp: $checkedConvert('xp', (v) => v as num),
        isMe: $checkedConvert('isMe', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$FriendBoardEntryDtoToJson(
  FriendBoardEntryDto instance,
) => <String, dynamic>{
  'rank': instance.rank,
  'userId': instance.userId,
  'nickname': instance.nickname,
  'avatarKey': instance.avatarKey,
  'xp': instance.xp,
  'isMe': instance.isMe,
};
