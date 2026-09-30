//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'week_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class WeekDto {
  /// Returns a new [WeekDto] instance.
  WeekDto({
    required this.key,

    required this.startDay,

    required this.endDay,

    required this.xp,

    required this.hidden,

    required this.globalRank,

    required this.countryRank,

    required this.regionRank,

    required this.cityRank,

    required this.countryCode,
  });

  /// ISO week, e.g. \"2026-W40\". Boards reset at Monday 00:00 in the student's time zone.
  @JsonKey(name: r'key', required: true, includeIfNull: false)
  final String key;

  /// Monday (the student's date).
  @JsonKey(name: r'startDay', required: true, includeIfNull: false)
  final String startDay;

  /// The next Monday, when the board resets.
  @JsonKey(name: r'endDay', required: true, includeIfNull: false)
  final String endDay;

  /// XP earned this week.
  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  /// True when the family keeps the student off public leaderboards.
  @JsonKey(name: r'hidden', required: true, includeIfNull: false)
  final bool hidden;

  @JsonKey(name: r'globalRank', required: true, includeIfNull: true)
  final num? globalRank;

  @JsonKey(name: r'countryRank', required: true, includeIfNull: true)
  final num? countryRank;

  /// Null until the region's board is open (enough students) or no region is set.
  @JsonKey(name: r'regionRank', required: true, includeIfNull: true)
  final num? regionRank;

  @JsonKey(name: r'cityRank', required: true, includeIfNull: true)
  final num? cityRank;

  @JsonKey(name: r'countryCode', required: true, includeIfNull: true)
  final String? countryCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is WeekDto &&
          other.key == key &&
          other.startDay == startDay &&
          other.endDay == endDay &&
          other.xp == xp &&
          other.hidden == hidden &&
          other.globalRank == globalRank &&
          other.countryRank == countryRank &&
          other.regionRank == regionRank &&
          other.cityRank == cityRank &&
          other.countryCode == countryCode;

  @override
  int get hashCode =>
      key.hashCode +
      startDay.hashCode +
      endDay.hashCode +
      xp.hashCode +
      hidden.hashCode +
      (globalRank == null ? 0 : globalRank.hashCode) +
      (countryRank == null ? 0 : countryRank.hashCode) +
      (regionRank == null ? 0 : regionRank.hashCode) +
      (cityRank == null ? 0 : cityRank.hashCode) +
      (countryCode == null ? 0 : countryCode.hashCode);

  factory WeekDto.fromJson(Map<String, dynamic> json) =>
      _$WeekDtoFromJson(json);

  Map<String, dynamic> toJson() => _$WeekDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
