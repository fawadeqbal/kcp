//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'student_friend_request_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class StudentFriendRequestDto {
  /// Returns a new [StudentFriendRequestDto] instance.
  StudentFriendRequestDto({
    required this.status,

    required this.id,

    required this.nickname,

    required this.avatarKey,

    required this.createdAt,
  });

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: StudentFriendRequestDtoStatusEnum.unknownDefaultOpenApi,
  )
  final StudentFriendRequestDtoStatusEnum status;

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  @JsonKey(name: r'createdAt', required: true, includeIfNull: false)
  final DateTime createdAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StudentFriendRequestDto &&
          other.status == status &&
          other.id == id &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey &&
          other.createdAt == createdAt;

  @override
  int get hashCode =>
      status.hashCode +
      id.hashCode +
      nickname.hashCode +
      avatarKey.hashCode +
      createdAt.hashCode;

  factory StudentFriendRequestDto.fromJson(Map<String, dynamic> json) =>
      _$StudentFriendRequestDtoFromJson(json);

  Map<String, dynamic> toJson() => _$StudentFriendRequestDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum StudentFriendRequestDtoStatusEnum {
  @JsonValue(r'PENDING')
  PENDING(r'PENDING'),
  @JsonValue(r'APPROVED')
  APPROVED(r'APPROVED'),
  @JsonValue(r'DECLINED')
  DECLINED(r'DECLINED'),
  @JsonValue(r'CANCELLED')
  CANCELLED(r'CANCELLED'),
  @JsonValue(r'EXPIRED')
  EXPIRED(r'EXPIRED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const StudentFriendRequestDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
