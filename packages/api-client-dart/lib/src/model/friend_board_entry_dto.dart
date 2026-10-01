//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'friend_board_entry_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class FriendBoardEntryDto {
  /// Returns a new [FriendBoardEntryDto] instance.
  FriendBoardEntryDto({
    required this.rank,

    required this.userId,

    required this.nickname,

    required this.avatarKey,

    required this.xp,

    required this.isMe,
  });

  @JsonKey(name: r'rank', required: true, includeIfNull: false)
  final num rank;

  @JsonKey(name: r'userId', required: true, includeIfNull: false)
  final String userId;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  /// XP this week.
  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  @JsonKey(name: r'isMe', required: true, includeIfNull: false)
  final bool isMe;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FriendBoardEntryDto &&
          other.rank == rank &&
          other.userId == userId &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.xp == xp &&
          other.isMe == isMe;

  @override
  int get hashCode =>
      rank.hashCode +
      userId.hashCode +
      nickname.hashCode +
      avatarKey.hashCode +
      xp.hashCode +
      isMe.hashCode;

  factory FriendBoardEntryDto.fromJson(Map<String, dynamic> json) =>
      _$FriendBoardEntryDtoFromJson(json);

  Map<String, dynamic> toJson() => _$FriendBoardEntryDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
