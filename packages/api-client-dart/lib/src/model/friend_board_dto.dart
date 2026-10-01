//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/friend_board_entry_dto.dart';
import 'package:kcp_api/src/model/friend_board_dto_week.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'friend_board_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class FriendBoardDto {
  /// Returns a new [FriendBoardDto] instance.
  FriendBoardDto({required this.week, required this.entries});

  @JsonKey(name: r'week', required: true, includeIfNull: false)
  final FriendBoardDtoWeek week;

  @JsonKey(name: r'entries', required: true, includeIfNull: false)
  final List<FriendBoardEntryDto> entries;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FriendBoardDto && other.week == week && other.entries == entries;

  @override
  int get hashCode => week.hashCode + entries.hashCode;

  factory FriendBoardDto.fromJson(Map<String, dynamic> json) =>
      _$FriendBoardDtoFromJson(json);

  Map<String, dynamic> toJson() => _$FriendBoardDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
