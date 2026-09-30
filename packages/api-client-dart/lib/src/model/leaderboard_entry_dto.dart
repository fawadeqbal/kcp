//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'leaderboard_entry_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LeaderboardEntryDto {
  /// Returns a new [LeaderboardEntryDto] instance.
  LeaderboardEntryDto({
    required this.rank,

    required this.nickname,

    required this.avatarKey,

    required this.xp,

    required this.isMe,
  });

  @JsonKey(name: r'rank', required: true, includeIfNull: false)
  final num rank;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  /// XP in the period.
  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  @JsonKey(name: r'isMe', required: true, includeIfNull: false)
  final bool isMe;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeaderboardEntryDto &&
          other.rank == rank &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.xp == xp &&
          other.isMe == isMe;

  @override
  int get hashCode =>
      rank.hashCode +
      nickname.hashCode +
      avatarKey.hashCode +
      xp.hashCode +
      isMe.hashCode;

  factory LeaderboardEntryDto.fromJson(Map<String, dynamic> json) =>
      _$LeaderboardEntryDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LeaderboardEntryDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
