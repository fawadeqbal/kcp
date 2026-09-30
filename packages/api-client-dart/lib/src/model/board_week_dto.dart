//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'board_week_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class BoardWeekDto {
  /// Returns a new [BoardWeekDto] instance.
  BoardWeekDto({
    required this.key,

    required this.startDay,

    required this.endDay,
  });

  @JsonKey(name: r'key', required: true, includeIfNull: false)
  final String key;

  @JsonKey(name: r'startDay', required: true, includeIfNull: false)
  final String startDay;

  /// When the board resets (Monday 00:00, the student's time).
  @JsonKey(name: r'endDay', required: true, includeIfNull: false)
  final String endDay;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BoardWeekDto &&
          other.key == key &&
          other.startDay == startDay &&
          other.endDay == endDay;

  @override
  int get hashCode => key.hashCode + startDay.hashCode + endDay.hashCode;

  factory BoardWeekDto.fromJson(Map<String, dynamic> json) =>
      _$BoardWeekDtoFromJson(json);

  Map<String, dynamic> toJson() => _$BoardWeekDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
