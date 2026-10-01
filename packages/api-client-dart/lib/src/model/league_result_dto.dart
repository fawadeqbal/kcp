//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'league_result_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LeagueResultDto {
  /// Returns a new [LeagueResultDto] instance.
  LeagueResultDto({
    required this.tier,

    required this.outcome,

    required this.newTier,

    required this.weekKey,

    required this.rank,
  });

  /// The league the student played that week in.
  @JsonKey(
    name: r'tier',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LeagueResultDtoTierEnum.unknownDefaultOpenApi,
  )
  final LeagueResultDtoTierEnum tier;

  @JsonKey(
    name: r'outcome',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LeagueResultDtoOutcomeEnum.unknownDefaultOpenApi,
  )
  final LeagueResultDtoOutcomeEnum outcome;

  /// The league they are in now.
  @JsonKey(
    name: r'newTier',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LeagueResultDtoNewTierEnum.unknownDefaultOpenApi,
  )
  final LeagueResultDtoNewTierEnum newTier;

  @JsonKey(name: r'weekKey', required: true, includeIfNull: false)
  final String weekKey;

  @JsonKey(name: r'rank', required: true, includeIfNull: false)
  final num rank;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeagueResultDto &&
          other.tier == tier &&
          other.outcome == outcome &&
          other.newTier == newTier &&
          other.weekKey == weekKey &&
          other.rank == rank;

  @override
  int get hashCode =>
      tier.hashCode +
      outcome.hashCode +
      newTier.hashCode +
      weekKey.hashCode +
      rank.hashCode;

  factory LeagueResultDto.fromJson(Map<String, dynamic> json) =>
      _$LeagueResultDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LeagueResultDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// The league the student played that week in.
enum LeagueResultDtoTierEnum {
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

  const LeagueResultDtoTierEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

enum LeagueResultDtoOutcomeEnum {
  @JsonValue(r'PROMOTED')
  PROMOTED(r'PROMOTED'),
  @JsonValue(r'STAYED')
  STAYED(r'STAYED'),
  @JsonValue(r'RELEGATED')
  RELEGATED(r'RELEGATED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LeagueResultDtoOutcomeEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// The league they are in now.
enum LeagueResultDtoNewTierEnum {
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

  const LeagueResultDtoNewTierEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
