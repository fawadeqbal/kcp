//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/chat_author_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'chat_message_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChatMessageDto {
  /// Returns a new [ChatMessageDto] instance.
  ChatMessageDto({
    required this.kind,

    required this.id,

    required this.roomId,

    required this.author,

    required this.phraseKey,

    required this.text,

    required this.hidden,

    required this.createdAt,
  });

  @JsonKey(
    name: r'kind',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ChatMessageDtoKindEnum.unknownDefaultOpenApi,
  )
  final ChatMessageDtoKindEnum kind;

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'roomId', required: true, includeIfNull: false)
  final String roomId;

  @JsonKey(name: r'author', required: true, includeIfNull: false)
  final ChatAuthorDto author;

  /// PHRASE: which one (the apps show it in the reader's language).
  @JsonKey(name: r'phraseKey', required: true, includeIfNull: true)
  final String? phraseKey;

  /// TEXT: what was typed; null when a moderator removed the message.
  @JsonKey(name: r'text', required: true, includeIfNull: true)
  final String? text;

  @JsonKey(name: r'hidden', required: true, includeIfNull: false)
  final bool hidden;

  @JsonKey(name: r'createdAt', required: true, includeIfNull: false)
  final DateTime createdAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatMessageDto &&
          other.kind == kind &&
          other.id == id &&
          other.roomId == roomId &&
          other.author == author &&
          other.phraseKey == phraseKey &&
          other.text == text &&
          other.hidden == hidden &&
          other.createdAt == createdAt;

  @override
  int get hashCode =>
      kind.hashCode +
      id.hashCode +
      roomId.hashCode +
      author.hashCode +
      (phraseKey == null ? 0 : phraseKey.hashCode) +
      (text == null ? 0 : text.hashCode) +
      hidden.hashCode +
      createdAt.hashCode;

  factory ChatMessageDto.fromJson(Map<String, dynamic> json) =>
      _$ChatMessageDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChatMessageDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ChatMessageDtoKindEnum {
  @JsonValue(r'PHRASE')
  PHRASE(r'PHRASE'),
  @JsonValue(r'TEXT')
  TEXT(r'TEXT'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ChatMessageDtoKindEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
