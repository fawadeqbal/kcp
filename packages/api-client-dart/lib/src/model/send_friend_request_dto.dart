//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'send_friend_request_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class SendFriendRequestDto {
  /// Returns a new [SendFriendRequestDto] instance.
  SendFriendRequestDto({required this.code});

  /// A friend's code, as typed (spaces and dashes are fine).
  @JsonKey(name: r'code', required: true, includeIfNull: false)
  final String code;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SendFriendRequestDto && other.code == code;

  @override
  int get hashCode => code.hashCode;

  factory SendFriendRequestDto.fromJson(Map<String, dynamic> json) =>
      _$SendFriendRequestDtoFromJson(json);

  Map<String, dynamic> toJson() => _$SendFriendRequestDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
