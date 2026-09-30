//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/streak_dto.dart';
import 'package:kcp_api/src/model/level_dto.dart';
import 'package:kcp_api/src/model/season_dto.dart';
import 'package:kcp_api/src/model/badge_counts_dto.dart';
import 'package:kcp_api/src/model/today_dto.dart';
import 'package:kcp_api/src/model/week_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'progress_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ProgressDto {
  /// Returns a new [ProgressDto] instance.
  ProgressDto({
    required this.xpTotal,

    required this.level,

    required this.today,

    required this.streak,

    required this.week,

    required this.season,

    required this.badges,
  });

  @JsonKey(name: r'xpTotal', required: true, includeIfNull: false)
  final num xpTotal;

  @JsonKey(name: r'level', required: true, includeIfNull: false)
  final LevelDto level;

  @JsonKey(name: r'today', required: true, includeIfNull: false)
  final TodayDto today;

  @JsonKey(name: r'streak', required: true, includeIfNull: false)
  final StreakDto streak;

  @JsonKey(name: r'week', required: true, includeIfNull: false)
  final WeekDto week;

  /// The season staff are running, if any.
  @JsonKey(name: r'season', required: true, includeIfNull: true)
  final SeasonDto? season;

  @JsonKey(name: r'badges', required: true, includeIfNull: false)
  final BadgeCountsDto badges;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ProgressDto &&
          other.xpTotal == xpTotal &&
          other.level == level &&
          other.today == today &&
          other.streak == streak &&
          other.week == week &&
          other.season == season &&
          other.badges == badges;

  @override
  int get hashCode =>
      xpTotal.hashCode +
      level.hashCode +
      today.hashCode +
      streak.hashCode +
      week.hashCode +
      (season == null ? 0 : season.hashCode) +
      badges.hashCode;

  factory ProgressDto.fromJson(Map<String, dynamic> json) =>
      _$ProgressDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ProgressDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
