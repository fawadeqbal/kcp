//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'chat_room_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChatRoomDto {
  /// Returns a new [ChatRoomDto] instance.
  ChatRoomDto({
    required this.kind,

    required this.id,

    required this.name,

    required this.unread,

    required this.lastMessageAt,

    required this.canType,

    required this.mutedUntil,

    required this.archived,
  });

  @JsonKey(
    name: r'kind',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ChatRoomDtoKindEnum.unknownDefaultOpenApi,
  )
  final ChatRoomDtoKindEnum kind;

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'name', required: true, includeIfNull: false)
  final String name;

  /// Messages since the member last read the room.
  @JsonKey(name: r'unread', required: true, includeIfNull: false)
  final num unread;

  @JsonKey(name: r'lastMessageAt', required: true, includeIfNull: true)
  final DateTime? lastMessageAt;

  /// The viewer may type text (13 and older, and adults); otherwise phrases only.
  @JsonKey(name: r'canType', required: true, includeIfNull: false)
  final bool canType;

  /// Muted by a moderator until then (no sending).
  @JsonKey(name: r'mutedUntil', required: true, includeIfNull: true)
  final DateTime? mutedUntil;

  /// The team, class or event ended: readable, no sending.
  @JsonKey(name: r'archived', required: true, includeIfNull: false)
  final bool archived;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatRoomDto &&
          other.kind == kind &&
          other.id == id &&
          other.name == name &&
          other.unread == unread &&
          other.lastMessageAt == lastMessageAt &&
          other.canType == canType &&
          other.mutedUntil == mutedUntil &&
          other.archived == archived;

  @override
  int get hashCode =>
      kind.hashCode +
      id.hashCode +
      name.hashCode +
      unread.hashCode +
      (lastMessageAt == null ? 0 : lastMessageAt.hashCode) +
      canType.hashCode +
      (mutedUntil == null ? 0 : mutedUntil.hashCode) +
      archived.hashCode;

  factory ChatRoomDto.fromJson(Map<String, dynamic> json) =>
      _$ChatRoomDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChatRoomDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ChatRoomDtoKindEnum {
  @JsonValue(r'TEAM')
  TEAM(r'TEAM'),
  @JsonValue(r'CLASS')
  CLASS(r'CLASS'),
  @JsonValue(r'EVENT')
  EVENT(r'EVENT'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ChatRoomDtoKindEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
