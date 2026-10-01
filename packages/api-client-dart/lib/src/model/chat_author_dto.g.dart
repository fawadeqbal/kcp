// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_author_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChatAuthorDtoCWProxy {
  ChatAuthorDto id(String id);

  ChatAuthorDto name(String name);

  ChatAuthorDto avatarKey(String? avatarKey);

  ChatAuthorDto isAdult(bool isAdult);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatAuthorDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatAuthorDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatAuthorDto call({String id, String name, String? avatarKey, bool isAdult});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChatAuthorDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChatAuthorDto.copyWith.fieldName(...)`
class _$ChatAuthorDtoCWProxyImpl implements _$ChatAuthorDtoCWProxy {
  const _$ChatAuthorDtoCWProxyImpl(this._value);

  final ChatAuthorDto _value;

  @override
  ChatAuthorDto id(String id) => this(id: id);

  @override
  ChatAuthorDto name(String name) => this(name: name);

  @override
  ChatAuthorDto avatarKey(String? avatarKey) => this(avatarKey: avatarKey);

  @override
  ChatAuthorDto isAdult(bool isAdult) => this(isAdult: isAdult);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatAuthorDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatAuthorDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatAuthorDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? isAdult = const $CopyWithPlaceholder(),
  }) {
    return ChatAuthorDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      name: name == const $CopyWithPlaceholder()
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as String?,
      isAdult: isAdult == const $CopyWithPlaceholder()
          ? _value.isAdult
          // ignore: cast_nullable_to_non_nullable
          : isAdult as bool,
    );
  }
}

extension $ChatAuthorDtoCopyWith on ChatAuthorDto {
  /// Returns a callable class that can be used as follows: `instanceOfChatAuthorDto.copyWith(...)` or like so:`instanceOfChatAuthorDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChatAuthorDtoCWProxy get copyWith => _$ChatAuthorDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChatAuthorDto _$ChatAuthorDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ChatAuthorDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['id', 'name', 'avatarKey', 'isAdult'],
      );
      final val = ChatAuthorDto(
        id: $checkedConvert('id', (v) => v as String),
        name: $checkedConvert('name', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String?),
        isAdult: $checkedConvert('isAdult', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$ChatAuthorDtoToJson(ChatAuthorDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'avatarKey': instance.avatarKey,
      'isAdult': instance.isAdult,
    };
