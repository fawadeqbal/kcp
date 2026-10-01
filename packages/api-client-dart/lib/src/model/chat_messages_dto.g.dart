// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_messages_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChatMessagesDtoCWProxy {
  ChatMessagesDto room(ChatRoomDto room);

  ChatMessagesDto messages(List<ChatMessageDto> messages);

  ChatMessagesDto hasMore(bool hasMore);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatMessagesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatMessagesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatMessagesDto call({
    ChatRoomDto room,
    List<ChatMessageDto> messages,
    bool hasMore,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChatMessagesDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChatMessagesDto.copyWith.fieldName(...)`
class _$ChatMessagesDtoCWProxyImpl implements _$ChatMessagesDtoCWProxy {
  const _$ChatMessagesDtoCWProxyImpl(this._value);

  final ChatMessagesDto _value;

  @override
  ChatMessagesDto room(ChatRoomDto room) => this(room: room);

  @override
  ChatMessagesDto messages(List<ChatMessageDto> messages) =>
      this(messages: messages);

  @override
  ChatMessagesDto hasMore(bool hasMore) => this(hasMore: hasMore);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatMessagesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatMessagesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatMessagesDto call({
    Object? room = const $CopyWithPlaceholder(),
    Object? messages = const $CopyWithPlaceholder(),
    Object? hasMore = const $CopyWithPlaceholder(),
  }) {
    return ChatMessagesDto(
      room: room == const $CopyWithPlaceholder()
          ? _value.room
          // ignore: cast_nullable_to_non_nullable
          : room as ChatRoomDto,
      messages: messages == const $CopyWithPlaceholder()
          ? _value.messages
          // ignore: cast_nullable_to_non_nullable
          : messages as List<ChatMessageDto>,
      hasMore: hasMore == const $CopyWithPlaceholder()
          ? _value.hasMore
          // ignore: cast_nullable_to_non_nullable
          : hasMore as bool,
    );
  }
}

extension $ChatMessagesDtoCopyWith on ChatMessagesDto {
  /// Returns a callable class that can be used as follows: `instanceOfChatMessagesDto.copyWith(...)` or like so:`instanceOfChatMessagesDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChatMessagesDtoCWProxy get copyWith => _$ChatMessagesDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChatMessagesDto _$ChatMessagesDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ChatMessagesDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['room', 'messages', 'hasMore']);
      final val = ChatMessagesDto(
        room: $checkedConvert(
          'room',
          (v) => ChatRoomDto.fromJson(v as Map<String, dynamic>),
        ),
        messages: $checkedConvert(
          'messages',
          (v) => (v as List<dynamic>)
              .map((e) => ChatMessageDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        hasMore: $checkedConvert('hasMore', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$ChatMessagesDtoToJson(ChatMessagesDto instance) =>
    <String, dynamic>{
      'room': instance.room.toJson(),
      'messages': instance.messages.map((e) => e.toJson()).toList(),
      'hasMore': instance.hasMore,
    };
