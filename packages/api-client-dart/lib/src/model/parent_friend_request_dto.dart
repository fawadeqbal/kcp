//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/friend_other_dto.dart';
import 'package:kcp_api/src/model/friend_child_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_friend_request_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentFriendRequestDto {
  /// Returns a new [ParentFriendRequestDto] instance.
  ParentFriendRequestDto({
    required this.direction,

    required this.id,

    required this.child,

    required this.other,

    required this.waitingForYou,

    required this.waitingForOtherFamily,

    required this.createdAt,
  });

  /// \"sent\": the parent's child asked; \"received\": the other child asked.
  @JsonKey(
    name: r'direction',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ParentFriendRequestDtoDirectionEnum.unknownDefaultOpenApi,
  )
  final ParentFriendRequestDtoDirectionEnum direction;

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  /// The parent's own child.
  @JsonKey(name: r'child', required: true, includeIfNull: false)
  final FriendChildDto child;

  /// The other child (nickname and avatar only).
  @JsonKey(name: r'other', required: true, includeIfNull: false)
  final FriendOtherDto other;

  /// This parent still has to approve or decline.
  @JsonKey(name: r'waitingForYou', required: true, includeIfNull: false)
  final bool waitingForYou;

  /// The other family still has to approve.
  @JsonKey(name: r'waitingForOtherFamily', required: true, includeIfNull: false)
  final bool waitingForOtherFamily;

  @JsonKey(name: r'createdAt', required: true, includeIfNull: false)
  final DateTime createdAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentFriendRequestDto &&
          other.direction == direction &&
          other.id == id &&
          other.child == child &&
          other.other == other &&
          other.waitingForYou == waitingForYou &&
          other.waitingForOtherFamily == waitingForOtherFamily &&
          other.createdAt == createdAt;

  @override
  int get hashCode =>
      direction.hashCode +
      id.hashCode +
      child.hashCode +
      other.hashCode +
      waitingForYou.hashCode +
      waitingForOtherFamily.hashCode +
      createdAt.hashCode;

  factory ParentFriendRequestDto.fromJson(Map<String, dynamic> json) =>
      _$ParentFriendRequestDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentFriendRequestDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// \"sent\": the parent's child asked; \"received\": the other child asked.
enum ParentFriendRequestDtoDirectionEnum {
  @JsonValue(r'sent')
  sent(r'sent'),
  @JsonValue(r'received')
  received(r'received'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ParentFriendRequestDtoDirectionEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
