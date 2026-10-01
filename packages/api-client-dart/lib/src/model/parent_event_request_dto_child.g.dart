// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_event_request_dto_child.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentEventRequestDtoChildCWProxy {
  ParentEventRequestDtoChild id(String id);

  ParentEventRequestDtoChild nickname(String nickname);

  ParentEventRequestDtoChild avatarKey(String avatarKey);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentEventRequestDtoChild(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentEventRequestDtoChild(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentEventRequestDtoChild call({
    String id,
    String nickname,
    String avatarKey,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentEventRequestDtoChild.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentEventRequestDtoChild.copyWith.fieldName(...)`
class _$ParentEventRequestDtoChildCWProxyImpl
    implements _$ParentEventRequestDtoChildCWProxy {
  const _$ParentEventRequestDtoChildCWProxyImpl(this._value);

  final ParentEventRequestDtoChild _value;

  @override
  ParentEventRequestDtoChild id(String id) => this(id: id);

  @override
  ParentEventRequestDtoChild nickname(String nickname) =>
      this(nickname: nickname);

  @override
  ParentEventRequestDtoChild avatarKey(String avatarKey) =>
      this(avatarKey: avatarKey);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentEventRequestDtoChild(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentEventRequestDtoChild(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentEventRequestDtoChild call({
    Object? id = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
  }) {
    return ParentEventRequestDtoChild(
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

extension $ParentEventRequestDtoChildCopyWith on ParentEventRequestDtoChild {
  /// Returns a callable class that can be used as follows: `instanceOfParentEventRequestDtoChild.copyWith(...)` or like so:`instanceOfParentEventRequestDtoChild.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentEventRequestDtoChildCWProxy get copyWith =>
      _$ParentEventRequestDtoChildCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentEventRequestDtoChild _$ParentEventRequestDtoChildFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ParentEventRequestDtoChild', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['id', 'nickname', 'avatarKey']);
  final val = ParentEventRequestDtoChild(
    id: $checkedConvert('id', (v) => v as String),
    nickname: $checkedConvert('nickname', (v) => v as String),
    avatarKey: $checkedConvert('avatarKey', (v) => v as String),
  );
  return val;
});

Map<String, dynamic> _$ParentEventRequestDtoChildToJson(
  ParentEventRequestDtoChild instance,
) => <String, dynamic>{
  'id': instance.id,
  'nickname': instance.nickname,
  'avatarKey': instance.avatarKey,
};
