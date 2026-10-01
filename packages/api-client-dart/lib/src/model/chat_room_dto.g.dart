// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_room_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChatRoomDtoCWProxy {
  ChatRoomDto kind(ChatRoomDtoKindEnum kind);

  ChatRoomDto id(String id);

  ChatRoomDto name(String name);

  ChatRoomDto unread(num unread);

  ChatRoomDto lastMessageAt(DateTime? lastMessageAt);

  ChatRoomDto canType(bool canType);

  ChatRoomDto mutedUntil(DateTime? mutedUntil);

  ChatRoomDto archived(bool archived);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatRoomDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatRoomDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatRoomDto call({
    ChatRoomDtoKindEnum kind,
    String id,
    String name,
    num unread,
    DateTime? lastMessageAt,
    bool canType,
    DateTime? mutedUntil,
    bool archived,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChatRoomDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChatRoomDto.copyWith.fieldName(...)`
class _$ChatRoomDtoCWProxyImpl implements _$ChatRoomDtoCWProxy {
  const _$ChatRoomDtoCWProxyImpl(this._value);

  final ChatRoomDto _value;

  @override
  ChatRoomDto kind(ChatRoomDtoKindEnum kind) => this(kind: kind);

  @override
  ChatRoomDto id(String id) => this(id: id);

  @override
  ChatRoomDto name(String name) => this(name: name);

  @override
  ChatRoomDto unread(num unread) => this(unread: unread);

  @override
  ChatRoomDto lastMessageAt(DateTime? lastMessageAt) =>
      this(lastMessageAt: lastMessageAt);

  @override
  ChatRoomDto canType(bool canType) => this(canType: canType);

  @override
  ChatRoomDto mutedUntil(DateTime? mutedUntil) => this(mutedUntil: mutedUntil);

  @override
  ChatRoomDto archived(bool archived) => this(archived: archived);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatRoomDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatRoomDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatRoomDto call({
    Object? kind = const $CopyWithPlaceholder(),
    Object? id = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? unread = const $CopyWithPlaceholder(),
    Object? lastMessageAt = const $CopyWithPlaceholder(),
    Object? canType = const $CopyWithPlaceholder(),
    Object? mutedUntil = const $CopyWithPlaceholder(),
    Object? archived = const $CopyWithPlaceholder(),
  }) {
    return ChatRoomDto(
      kind: kind == const $CopyWithPlaceholder()
          ? _value.kind
          // ignore: cast_nullable_to_non_nullable
          : kind as ChatRoomDtoKindEnum,
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      name: name == const $CopyWithPlaceholder()
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      unread: unread == const $CopyWithPlaceholder()
          ? _value.unread
          // ignore: cast_nullable_to_non_nullable
          : unread as num,
      lastMessageAt: lastMessageAt == const $CopyWithPlaceholder()
          ? _value.lastMessageAt
          // ignore: cast_nullable_to_non_nullable
          : lastMessageAt as DateTime?,
      canType: canType == const $CopyWithPlaceholder()
          ? _value.canType
          // ignore: cast_nullable_to_non_nullable
          : canType as bool,
      mutedUntil: mutedUntil == const $CopyWithPlaceholder()
          ? _value.mutedUntil
          // ignore: cast_nullable_to_non_nullable
          : mutedUntil as DateTime?,
      archived: archived == const $CopyWithPlaceholder()
          ? _value.archived
          // ignore: cast_nullable_to_non_nullable
          : archived as bool,
    );
  }
}

extension $ChatRoomDtoCopyWith on ChatRoomDto {
  /// Returns a callable class that can be used as follows: `instanceOfChatRoomDto.copyWith(...)` or like so:`instanceOfChatRoomDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChatRoomDtoCWProxy get copyWith => _$ChatRoomDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChatRoomDto _$ChatRoomDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ChatRoomDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'kind',
          'id',
          'name',
          'unread',
          'lastMessageAt',
          'canType',
          'mutedUntil',
          'archived',
        ],
      );
      final val = ChatRoomDto(
        kind: $checkedConvert(
          'kind',
          (v) => $enumDecode(
            _$ChatRoomDtoKindEnumEnumMap,
            v,
            unknownValue: ChatRoomDtoKindEnum.unknownDefaultOpenApi,
          ),
        ),
        id: $checkedConvert('id', (v) => v as String),
        name: $checkedConvert('name', (v) => v as String),
        unread: $checkedConvert('unread', (v) => v as num),
        lastMessageAt: $checkedConvert(
          'lastMessageAt',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
        canType: $checkedConvert('canType', (v) => v as bool),
        mutedUntil: $checkedConvert(
          'mutedUntil',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
        archived: $checkedConvert('archived', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$ChatRoomDtoToJson(ChatRoomDto instance) =>
    <String, dynamic>{
      'kind': _$ChatRoomDtoKindEnumEnumMap[instance.kind]!,
      'id': instance.id,
      'name': instance.name,
      'unread': instance.unread,
      'lastMessageAt': instance.lastMessageAt?.toIso8601String(),
      'canType': instance.canType,
      'mutedUntil': instance.mutedUntil?.toIso8601String(),
      'archived': instance.archived,
    };

const _$ChatRoomDtoKindEnumEnumMap = {
  ChatRoomDtoKindEnum.TEAM: 'TEAM',
  ChatRoomDtoKindEnum.CLASS: 'CLASS',
  ChatRoomDtoKindEnum.EVENT: 'EVENT',
  ChatRoomDtoKindEnum.HUB: 'HUB',
  ChatRoomDtoKindEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
