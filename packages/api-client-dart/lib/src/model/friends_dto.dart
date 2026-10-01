//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/friend_dto.dart';
import 'package:kcp_api/src/model/student_friend_request_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'friends_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class FriendsDto {
  /// Returns a new [FriendsDto] instance.
  FriendsDto({
    required this.code,

    required this.friends,

    required this.sent,

    required this.received,
  });

  /// The student's friend code, to give to friends.
  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final String code;

  @JsonKey(name: r'friends', required: true, includeIfNull: false)
  final List<FriendDto> friends;

  /// Requests the student sent (waiting for the parents, or recently declined).
  @JsonKey(name: r'sent', required: true, includeIfNull: false)
  final List<StudentFriendRequestDto> sent;

  /// Requests other students sent them, waiting for the parents.
  @JsonKey(name: r'received', required: true, includeIfNull: false)
  final List<StudentFriendRequestDto> received;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FriendsDto &&
          other.code == code &&
          other.friends == friends &&
          other.sent == sent &&
          other.received == received;

  @override
  int get hashCode =>
      code.hashCode + friends.hashCode + sent.hashCode + received.hashCode;

  factory FriendsDto.fromJson(Map<String, dynamic> json) =>
      _$FriendsDtoFromJson(json);

  Map<String, dynamic> toJson() => _$FriendsDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
