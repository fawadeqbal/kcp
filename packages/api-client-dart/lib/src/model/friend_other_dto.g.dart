// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friend_other_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FriendOtherDtoCWProxy {
  FriendOtherDto nickname(String nickname);

  FriendOtherDto avatarKey(String avatarKey);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendOtherDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendOtherDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendOtherDto call({String nickname, String avatarKey});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFriendOtherDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFriendOtherDto.copyWith.fieldName(...)`
class _$FriendOtherDtoCWProxyImpl implements _$FriendOtherDtoCWProxy {
  const _$FriendOtherDtoCWProxyImpl(this._value);

  final FriendOtherDto _value;

  @override
  FriendOtherDto nickname(String nickname) => this(nickname: nickname);

  @override
  FriendOtherDto avatarKey(String avatarKey) => this(avatarKey: avatarKey);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendOtherDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendOtherDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendOtherDto call({
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
  }) {
    return FriendOtherDto(
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as String,
    );
  }
}

extension $FriendOtherDtoCopyWith on FriendOtherDto {
  /// Returns a callable class that can be used as follows: `instanceOfFriendOtherDto.copyWith(...)` or like so:`instanceOfFriendOtherDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FriendOtherDtoCWProxy get copyWith => _$FriendOtherDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FriendOtherDto _$FriendOtherDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FriendOtherDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['nickname', 'avatarKey']);
      final val = FriendOtherDto(
        nickname: $checkedConvert('nickname', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$FriendOtherDtoToJson(FriendOtherDto instance) =>
    <String, dynamic>{
      'nickname': instance.nickname,
      'avatarKey': instance.avatarKey,
    };
