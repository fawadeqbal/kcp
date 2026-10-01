//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'friend_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class FriendDto {
  /// Returns a new [FriendDto] instance.
  FriendDto({
    required this.userId,

    required this.nickname,

    required this.avatarKey,

    required this.since,
  });

  @JsonKey(name: r'userId', required: true, includeIfNull: false)
  final String userId;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  /// When both parents approved.
  @JsonKey(name: r'since', required: true, includeIfNull: false)
  final DateTime since;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FriendDto &&
          other.userId == userId &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.since == since;

  @override
  int get hashCode =>
      userId.hashCode + nickname.hashCode + avatarKey.hashCode + since.hashCode;

  factory FriendDto.fromJson(Map<String, dynamic> json) =>
      _$FriendDtoFromJson(json);

  Map<String, dynamic> toJson() => _$FriendDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
