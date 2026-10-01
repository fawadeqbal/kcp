// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friend_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FriendDtoCWProxy {
  FriendDto userId(String userId);

  FriendDto nickname(String nickname);

  FriendDto avatarKey(String avatarKey);

  FriendDto since(DateTime since);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendDto call({
    String userId,
    String nickname,
    String avatarKey,
    DateTime since,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFriendDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFriendDto.copyWith.fieldName(...)`
class _$FriendDtoCWProxyImpl implements _$FriendDtoCWProxy {
  const _$FriendDtoCWProxyImpl(this._value);

  final FriendDto _value;

  @override
  FriendDto userId(String userId) => this(userId: userId);

  @override
  FriendDto nickname(String nickname) => this(nickname: nickname);

  @override
  FriendDto avatarKey(String avatarKey) => this(avatarKey: avatarKey);

  @override
  FriendDto since(DateTime since) => this(since: since);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendDto call({
    Object? userId = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? since = const $CopyWithPlaceholder(),
  }) {
    return FriendDto(
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
      since: since == const $CopyWithPlaceholder()
          ? _value.since
          // ignore: cast_nullable_to_non_nullable
          : since as DateTime,
    );
  }
}

extension $FriendDtoCopyWith on FriendDto {
  /// Returns a callable class that can be used as follows: `instanceOfFriendDto.copyWith(...)` or like so:`instanceOfFriendDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FriendDtoCWProxy get copyWith => _$FriendDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FriendDto _$FriendDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FriendDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['userId', 'nickname', 'avatarKey', 'since'],
      );
      final val = FriendDto(
        userId: $checkedConvert('userId', (v) => v as String),
        nickname: $checkedConvert('nickname', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String),
        since: $checkedConvert('since', (v) => DateTime.parse(v as String)),
      );
      return val;
    });

Map<String, dynamic> _$FriendDtoToJson(FriendDto instance) => <String, dynamic>{
  'userId': instance.userId,
  'nickname': instance.nickname,
  'avatarKey': instance.avatarKey,
  'since': instance.since.toIso8601String(),
};
