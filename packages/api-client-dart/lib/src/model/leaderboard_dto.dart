//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/leaderboard_entry_dto.dart';
import 'package:kcp_api/src/model/leaderboard_dto_me.dart';
import 'package:kcp_api/src/model/board_week_dto.dart';
import 'package:kcp_api/src/model/season_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'leaderboard_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LeaderboardDto {
  /// Returns a new [LeaderboardDto] instance.
  LeaderboardDto({
    required this.scope,

    required this.period,

    required this.countryCode,

    required this.areaName,

    required this.available,

    required this.minStudents,

    required this.week,

    required this.season,

    required this.entries,

    required this.me,
  });

  @JsonKey(
    name: r'scope',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LeaderboardDtoScopeEnum.unknownDefaultOpenApi,
  )
  final LeaderboardDtoScopeEnum scope;

  @JsonKey(
    name: r'period',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LeaderboardDtoPeriodEnum.unknownDefaultOpenApi,
  )
  final LeaderboardDtoPeriodEnum period;

  @JsonKey(name: r'countryCode', required: true, includeIfNull: true)
  final String? countryCode;

  /// The region's or city's name, for those boards.
  @JsonKey(name: r'areaName', required: true, includeIfNull: true)
  final String? areaName;

  /// False when there is nothing to show: no season running, no region or city set, or fewer than `minStudents` students there on public boards.
  @JsonKey(name: r'available', required: true, includeIfNull: false)
  final bool available;

  @JsonKey(name: r'minStudents', required: true, includeIfNull: false)
  final num minStudents;

  @JsonKey(name: r'week', required: true, includeIfNull: true)
  final BoardWeekDto? week;

  @JsonKey(name: r'season', required: true, includeIfNull: true)
  final SeasonDto? season;

  @JsonKey(name: r'entries', required: true, includeIfNull: false)
  final List<LeaderboardEntryDto> entries;

  @JsonKey(name: r'me', required: true, includeIfNull: false)
  final LeaderboardDtoMe me;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeaderboardDto &&
          other.scope == scope &&
          other.period == period &&
          other.countryCode == countryCode &&
          other.areaName == areaName &&
          other.available == available &&
          other.minStudents == minStudents &&
          other.week == week &&
          other.season == season &&
          other.entries == entries &&
          other.me == me;

  @override
  int get hashCode =>
      scope.hashCode +
      period.hashCode +
      (countryCode == null ? 0 : countryCode.hashCode) +
      (areaName == null ? 0 : areaName.hashCode) +
      available.hashCode +
      minStudents.hashCode +
      (week == null ? 0 : week.hashCode) +
      (season == null ? 0 : season.hashCode) +
      entries.hashCode +
      me.hashCode;

  factory LeaderboardDto.fromJson(Map<String, dynamic> json) =>
      _$LeaderboardDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LeaderboardDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum LeaderboardDtoScopeEnum {
  @JsonValue(r'country')
  country(r'country'),
  @JsonValue(r'region')
  region(r'region'),
  @JsonValue(r'city')
  city(r'city'),
  @JsonValue(r'global')
  global(r'global'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LeaderboardDtoScopeEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum LeaderboardDtoPeriodEnum {
  @JsonValue(r'all')
  all(r'all'),
  @JsonValue(r'week')
  week(r'week'),
  @JsonValue(r'season')
  season(r'season'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LeaderboardDtoPeriodEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
