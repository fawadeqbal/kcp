// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_message_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChatMessageDtoCWProxy {
  ChatMessageDto kind(ChatMessageDtoKindEnum kind);

  ChatMessageDto id(String id);

  ChatMessageDto roomId(String roomId);

  ChatMessageDto author(ChatAuthorDto author);

  ChatMessageDto phraseKey(String? phraseKey);

  ChatMessageDto text(String? text);

  ChatMessageDto hidden(bool hidden);

  ChatMessageDto createdAt(DateTime createdAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatMessageDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatMessageDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatMessageDto call({
    ChatMessageDtoKindEnum kind,
    String id,
    String roomId,
    ChatAuthorDto author,
    String? phraseKey,
    String? text,
    bool hidden,
    DateTime createdAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChatMessageDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChatMessageDto.copyWith.fieldName(...)`
class _$ChatMessageDtoCWProxyImpl implements _$ChatMessageDtoCWProxy {
  const _$ChatMessageDtoCWProxyImpl(this._value);

  final ChatMessageDto _value;

  @override
  ChatMessageDto kind(ChatMessageDtoKindEnum kind) => this(kind: kind);

  @override
  ChatMessageDto id(String id) => this(id: id);

  @override
  ChatMessageDto roomId(String roomId) => this(roomId: roomId);

  @override
  ChatMessageDto author(ChatAuthorDto author) => this(author: author);

  @override
  ChatMessageDto phraseKey(String? phraseKey) => this(phraseKey: phraseKey);

  @override
  ChatMessageDto text(String? text) => this(text: text);

  @override
  ChatMessageDto hidden(bool hidden) => this(hidden: hidden);

  @override
  ChatMessageDto createdAt(DateTime createdAt) => this(createdAt: createdAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChatMessageDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChatMessageDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChatMessageDto call({
    Object? kind = const $CopyWithPlaceholder(),
    Object? id = const $CopyWithPlaceholder(),
    Object? roomId = const $CopyWithPlaceholder(),
    Object? author = const $CopyWithPlaceholder(),
    Object? phraseKey = const $CopyWithPlaceholder(),
    Object? text = const $CopyWithPlaceholder(),
    Object? hidden = const $CopyWithPlaceholder(),
    Object? createdAt = const $CopyWithPlaceholder(),
  }) {
    return ChatMessageDto(
      kind: kind == const $CopyWithPlaceholder()
          ? _value.kind
          // ignore: cast_nullable_to_non_nullable
          : kind as ChatMessageDtoKindEnum,
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      roomId: roomId == const $CopyWithPlaceholder()
          ? _value.roomId
          // ignore: cast_nullable_to_non_nullable
          : roomId as String,
      author: author == const $CopyWithPlaceholder()
          ? _value.author
          // ignore: cast_nullable_to_non_nullable
          : author as ChatAuthorDto,
      phraseKey: phraseKey == const $CopyWithPlaceholder()
          ? _value.phraseKey
          // ignore: cast_nullable_to_non_nullable
          : phraseKey as String?,
      text: text == const $CopyWithPlaceholder()
          ? _value.text
          // ignore: cast_nullable_to_non_nullable
          : text as String?,
      hidden: hidden == const $CopyWithPlaceholder()
          ? _value.hidden
          // ignore: cast_nullable_to_non_nullable
          : hidden as bool,
      createdAt: createdAt == const $CopyWithPlaceholder()
          ? _value.createdAt
          // ignore: cast_nullable_to_non_nullable
          : createdAt as DateTime,
    );
  }
}

extension $ChatMessageDtoCopyWith on ChatMessageDto {
  /// Returns a callable class that can be used as follows: `instanceOfChatMessageDto.copyWith(...)` or like so:`instanceOfChatMessageDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChatMessageDtoCWProxy get copyWith => _$ChatMessageDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChatMessageDto _$ChatMessageDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ChatMessageDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'kind',
          'id',
          'roomId',
          'author',
          'phraseKey',
          'text',
          'hidden',
          'createdAt',
        ],
      );
      final val = ChatMessageDto(
        kind: $checkedConvert(
          'kind',
          (v) => $enumDecode(
            _$ChatMessageDtoKindEnumEnumMap,
            v,
            unknownValue: ChatMessageDtoKindEnum.unknownDefaultOpenApi,
          ),
        ),
        id: $checkedConvert('id', (v) => v as String),
        roomId: $checkedConvert('roomId', (v) => v as String),
        author: $checkedConvert(
          'author',
          (v) => ChatAuthorDto.fromJson(v as Map<String, dynamic>),
        ),
        phraseKey: $checkedConvert('phraseKey', (v) => v as String?),
        text: $checkedConvert('text', (v) => v as String?),
        hidden: $checkedConvert('hidden', (v) => v as bool),
        createdAt: $checkedConvert(
          'createdAt',
          (v) => DateTime.parse(v as String),
        ),
      );
      return val;
    });

Map<String, dynamic> _$ChatMessageDtoToJson(ChatMessageDto instance) =>
    <String, dynamic>{
      'kind': _$ChatMessageDtoKindEnumEnumMap[instance.kind]!,
      'id': instance.id,
      'roomId': instance.roomId,
      'author': instance.author.toJson(),
      'phraseKey': instance.phraseKey,
      'text': instance.text,
      'hidden': instance.hidden,
      'createdAt': instance.createdAt.toIso8601String(),
    };

const _$ChatMessageDtoKindEnumEnumMap = {
  ChatMessageDtoKindEnum.PHRASE: 'PHRASE',
  ChatMessageDtoKindEnum.TEXT: 'TEXT',
  ChatMessageDtoKindEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
