//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'streak_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class StreakDto {
  /// Returns a new [StreakDto] instance.
  StreakDto({
    required this.current,

    required this.longest,

    required this.doneToday,

    required this.freezes,

    required this.freezesNeeded,
  });

  /// Days in a row with the goal met (0 once a day is missed without a freeze).
  @JsonKey(name: r'current', required: true, includeIfNull: false)
  final num current;

  @JsonKey(name: r'longest', required: true, includeIfNull: false)
  final num longest;

  @JsonKey(name: r'doneToday', required: true, includeIfNull: false)
  final bool doneToday;

  /// Streak freezes held (each covers one missed day).
  @JsonKey(name: r'freezes', required: true, includeIfNull: false)
  final num freezes;

  /// Freezes that meeting today's goal will use (days missed since the last goal).
  @JsonKey(name: r'freezesNeeded', required: true, includeIfNull: false)
  final num freezesNeeded;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StreakDto &&
          other.current == current &&
          other.longest == longest &&
          other.doneToday == doneToday &&
          other.freezes == freezes &&
          other.freezesNeeded == freezesNeeded;

  @override
  int get hashCode =>
      current.hashCode +
      longest.hashCode +
      doneToday.hashCode +
      freezes.hashCode +
      freezesNeeded.hashCode;

  factory StreakDto.fromJson(Map<String, dynamic> json) =>
      _$StreakDtoFromJson(json);

  Map<String, dynamic> toJson() => _$StreakDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
