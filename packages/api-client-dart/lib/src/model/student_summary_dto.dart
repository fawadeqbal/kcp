//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'student_summary_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class StudentSummaryDto {
  /// Returns a new [StudentSummaryDto] instance.
  StudentSummaryDto({required this.nickname, required this.avatarKey});

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StudentSummaryDto &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey;

  @override
  int get hashCode => nickname.hashCode + avatarKey.hashCode;

  factory StudentSummaryDto.fromJson(Map<String, dynamic> json) =>
      _$StudentSummaryDtoFromJson(json);

  Map<String, dynamic> toJson() => _$StudentSummaryDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
