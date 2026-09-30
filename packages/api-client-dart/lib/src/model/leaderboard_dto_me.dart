//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'leaderboard_dto_me.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LeaderboardDtoMe {
  /// Returns a new [LeaderboardDtoMe] instance.
  LeaderboardDtoMe({
    required this.rank,

    required this.xp,

    required this.hidden,
  });

  @JsonKey(name: r'rank', required: true, includeIfNull: true)
  final num? rank;

  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  @JsonKey(name: r'hidden', required: true, includeIfNull: false)
  final bool hidden;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeaderboardDtoMe &&
          other.rank == rank &&
          other.xp == xp &&
          other.hidden == hidden;

  @override
  int get hashCode =>
      (rank == null ? 0 : rank.hashCode) + xp.hashCode + hidden.hashCode;

  factory LeaderboardDtoMe.fromJson(Map<String, dynamic> json) =>
      _$LeaderboardDtoMeFromJson(json);

  Map<String, dynamic> toJson() => _$LeaderboardDtoMeToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
