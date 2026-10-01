//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'league_week_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LeagueWeekDto {
  /// Returns a new [LeagueWeekDto] instance.
  LeagueWeekDto({
    required this.key,

    required this.startDay,

    required this.endDay,
  });

  @JsonKey(name: r'key', required: true, includeIfNull: false)
  final String key;

  @JsonKey(name: r'startDay', required: true, includeIfNull: false)
  final String startDay;

  /// The day after the week (it ends at Monday 00:00, the student's time; results come by Monday 00:00 UTC).
  @JsonKey(name: r'endDay', required: true, includeIfNull: false)
  final String endDay;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LeagueWeekDto &&
          other.key == key &&
          other.startDay == startDay &&
          other.endDay == endDay;

  @override
  int get hashCode => key.hashCode + startDay.hashCode + endDay.hashCode;

  factory LeagueWeekDto.fromJson(Map<String, dynamic> json) =>
      _$LeagueWeekDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LeagueWeekDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
