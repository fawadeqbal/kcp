//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/chat_message_dto.dart';
import 'package:kcp_api/src/model/chat_room_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'chat_messages_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChatMessagesDto {
  /// Returns a new [ChatMessagesDto] instance.
  ChatMessagesDto({
    required this.room,

    required this.messages,

    required this.hasMore,
  });

  @JsonKey(name: r'room', required: true, includeIfNull: false)
  final ChatRoomDto room;

  /// Oldest first.
  @JsonKey(name: r'messages', required: true, includeIfNull: false)
  final List<ChatMessageDto> messages;

  /// Pass the first message's createdAt as `before` for older ones.
  @JsonKey(name: r'hasMore', required: true, includeIfNull: false)
  final bool hasMore;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatMessagesDto &&
          other.room == room &&
          other.messages == messages &&
          other.hasMore == hasMore;

  @override
  int get hashCode => room.hashCode + messages.hashCode + hasMore.hashCode;

  factory ChatMessagesDto.fromJson(Map<String, dynamic> json) =>
      _$ChatMessagesDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChatMessagesDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
