//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/league_result_dto.dart';
import 'package:kcp_api/src/model/league_week_dto.dart';
import 'package:kcp_api/src/model/league_standing_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'league_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LeagueDto {
  /// Returns a new [LeagueDto] instance.
  LeagueDto({
    required this.tier,

    required this.tierIndex,

    required this.week,

    required this.joined,

    required this.standings,

    required this.promoteCount,

    required this.relegateCount,

    required this.lastResult,
  });

  @JsonKey(
    name: r'tier',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LeagueDtoTierEnum.unknownDefaultOpenApi,
  )
  final LeagueDtoTierEnum tier;

  /// 0 = Bronze … 6 = Diamond.
  @JsonKey(name: r'tierIndex', required: true, includeIfNull: false)
  final num tierIndex;

  @JsonKey(name: r'week', required: true, includeIfNull: false)
  final LeagueWeekDto week;

  /// False until the student earns XP this week (that puts them in a group).
  @JsonKey(name: r'joined', required: true, includeIfNull: false)
  final bool joined;

  /// The group, best first. Empty until joined.
  @JsonKey(name: r'standings', required: true, includeIfNull: false)
  final List<LeagueStandingDto> standings;

  /// How many move up and down when the week closes (in a group this size).
  @JsonKey(name: r'promoteCount', required: true, includeIfNull: false)
  final num promoteCount;

  @JsonKey(name: r'relegateCount', required: true, includeIfNull: false)
  final num relegateCount;

  /// Last week's result, until the student has seen it.
  @JsonKey(name: r'lastResult', required: true, includeIfNull: true)
  final LeagueResultDto? lastResult;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeagueDto &&
          other.tier == tier &&
          other.tierIndex == tierIndex &&
          other.week == week &&
          other.joined == joined &&
          other.standings == standings &&
          other.promoteCount == promoteCount &&
          other.relegateCount == relegateCount &&
          other.lastResult == lastResult;

  @override
  int get hashCode =>
      tier.hashCode +
      tierIndex.hashCode +
      week.hashCode +
      joined.hashCode +
      standings.hashCode +
      promoteCount.hashCode +
      relegateCount.hashCode +
      (lastResult == null ? 0 : lastResult.hashCode);

  factory LeagueDto.fromJson(Map<String, dynamic> json) =>
      _$LeagueDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LeagueDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum LeagueDtoTierEnum {
  @JsonValue(r'bronze')
  bronze(r'bronze'),
  @JsonValue(r'silver')
  silver(r'silver'),
  @JsonValue(r'gold')
  gold(r'gold'),
  @JsonValue(r'sapphire')
  sapphire(r'sapphire'),
  @JsonValue(r'ruby')
  ruby(r'ruby'),
  @JsonValue(r'emerald')
  emerald(r'emerald'),
  @JsonValue(r'diamond')
  diamond(r'diamond'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LeagueDtoTierEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
