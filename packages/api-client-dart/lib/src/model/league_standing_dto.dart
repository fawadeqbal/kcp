//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'league_standing_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LeagueStandingDto {
  /// Returns a new [LeagueStandingDto] instance.
  LeagueStandingDto({
    required this.zone,

    required this.rank,

    required this.nickname,

    required this.avatarKey,

    required this.xp,

    required this.isMe,

    required this.isFriend,
  });

  /// Where this place goes if the week ended now: up a league, down, or neither.
  @JsonKey(
    name: r'zone',
    required: true,
    includeIfNull: true,
    unknownEnumValue: LeagueStandingDtoZoneEnum.unknownDefaultOpenApi,
  )
  final LeagueStandingDtoZoneEnum? zone;

  @JsonKey(name: r'rank', required: true, includeIfNull: false)
  final num rank;

  /// Null for a student whose parent keeps them off public boards (shown as \"A player\"), unless it's the viewer or one of their friends.
  @JsonKey(name: r'nickname', required: true, includeIfNull: true)
  final String? nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: true)
  final String? avatarKey;

  /// XP this week.
  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  @JsonKey(name: r'isMe', required: true, includeIfNull: false)
  final bool isMe;

  @JsonKey(name: r'isFriend', required: true, includeIfNull: false)
  final bool isFriend;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeagueStandingDto &&
          other.zone == zone &&
          other.rank == rank &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.xp == xp &&
          other.isMe == isMe &&
          other.isFriend == isFriend;

  @override
  int get hashCode =>
      (zone == null ? 0 : zone.hashCode) +
      rank.hashCode +
      (nickname == null ? 0 : nickname.hashCode) +
      (avatarKey == null ? 0 : avatarKey.hashCode) +
      xp.hashCode +
      isMe.hashCode +
      isFriend.hashCode;

  factory LeagueStandingDto.fromJson(Map<String, dynamic> json) =>
      _$LeagueStandingDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LeagueStandingDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// Where this place goes if the week ended now: up a league, down, or neither.
enum LeagueStandingDtoZoneEnum {
  @JsonValue(r'up')
  up(r'up'),
  @JsonValue(r'down')
  down(r'down'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LeagueStandingDtoZoneEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
