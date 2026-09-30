//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'today_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class TodayDto {
  /// Returns a new [TodayDto] instance.
  TodayDto({
    required this.xp,

    required this.goalXp,

    required this.capXp,

    required this.capReached,
  });

  /// XP earned today, in the student's time zone.
  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  /// The daily goal behind the streak.
  @JsonKey(name: r'goalXp', required: true, includeIfNull: false)
  final num goalXp;

  /// Most XP that counts in one day.
  @JsonKey(name: r'capXp', required: true, includeIfNull: false)
  final num capXp;

  @JsonKey(name: r'capReached', required: true, includeIfNull: false)
  final bool capReached;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TodayDto &&
          other.xp == xp &&
          other.goalXp == goalXp &&
          other.capXp == capXp &&
          other.capReached == capReached;

  @override
  int get hashCode =>
      xp.hashCode + goalXp.hashCode + capXp.hashCode + capReached.hashCode;

  factory TodayDto.fromJson(Map<String, dynamic> json) =>
      _$TodayDtoFromJson(json);

  Map<String, dynamic> toJson() => _$TodayDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
