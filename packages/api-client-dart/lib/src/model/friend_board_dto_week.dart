//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'friend_board_dto_week.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class FriendBoardDtoWeek {
  /// Returns a new [FriendBoardDtoWeek] instance.
  FriendBoardDtoWeek({
    required this.key,

    required this.startDay,

    required this.endDay,
  });

  @JsonKey(name: r'key', required: true, includeIfNull: false)
  final String key;

  @JsonKey(name: r'startDay', required: true, includeIfNull: false)
  final String startDay;

  @JsonKey(name: r'endDay', required: true, includeIfNull: false)
  final String endDay;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FriendBoardDtoWeek &&
          other.key == key &&
          other.startDay == startDay &&
          other.endDay == endDay;

  @override
  int get hashCode => key.hashCode + startDay.hashCode + endDay.hashCode;

  factory FriendBoardDtoWeek.fromJson(Map<String, dynamic> json) =>
      _$FriendBoardDtoWeekFromJson(json);

  Map<String, dynamic> toJson() => _$FriendBoardDtoWeekToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
