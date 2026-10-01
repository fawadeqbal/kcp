//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'friend_other_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class FriendOtherDto {
  /// Returns a new [FriendOtherDto] instance.
  FriendOtherDto({required this.nickname, required this.avatarKey});

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FriendOtherDto &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey;

  @override
  int get hashCode => nickname.hashCode + avatarKey.hashCode;

  factory FriendOtherDto.fromJson(Map<String, dynamic> json) =>
      _$FriendOtherDtoFromJson(json);

  Map<String, dynamic> toJson() => _$FriendOtherDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
