// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friend_child_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FriendChildDtoCWProxy {
  FriendChildDto id(String id);

  FriendChildDto nickname(String nickname);

  FriendChildDto avatarKey(String avatarKey);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendChildDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendChildDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendChildDto call({String id, String nickname, String avatarKey});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFriendChildDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFriendChildDto.copyWith.fieldName(...)`
class _$FriendChildDtoCWProxyImpl implements _$FriendChildDtoCWProxy {
  const _$FriendChildDtoCWProxyImpl(this._value);

  final FriendChildDto _value;

  @override
  FriendChildDto id(String id) => this(id: id);

  @override
  FriendChildDto nickname(String nickname) => this(nickname: nickname);

  @override
  FriendChildDto avatarKey(String avatarKey) => this(avatarKey: avatarKey);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendChildDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendChildDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendChildDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
  }) {
    return FriendChildDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
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

extension $FriendChildDtoCopyWith on FriendChildDto {
  /// Returns a callable class that can be used as follows: `instanceOfFriendChildDto.copyWith(...)` or like so:`instanceOfFriendChildDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FriendChildDtoCWProxy get copyWith => _$FriendChildDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FriendChildDto _$FriendChildDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FriendChildDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['id', 'nickname', 'avatarKey']);
      final val = FriendChildDto(
        id: $checkedConvert('id', (v) => v as String),
        nickname: $checkedConvert('nickname', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$FriendChildDtoToJson(FriendChildDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'nickname': instance.nickname,
      'avatarKey': instance.avatarKey,
    };
