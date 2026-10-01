//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'chat_author_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ChatAuthorDto {
  /// Returns a new [ChatAuthorDto] instance.
  ChatAuthorDto({
    required this.id,

    required this.name,

    required this.avatarKey,

    required this.isAdult,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  /// A student's nickname, or an adult's name.
  @JsonKey(name: r'name', required: true, includeIfNull: false)
  final String name;

  /// Students only.
  @JsonKey(name: r'avatarKey', required: true, includeIfNull: true)
  final String? avatarKey;

  /// A teacher or mentor.
  @JsonKey(name: r'isAdult', required: true, includeIfNull: false)
  final bool isAdult;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatAuthorDto &&
          other.id == id &&
          other.name == name &&
          other.avatarKey == avatarKey &&
          other.isAdult == isAdult;

  @override
  int get hashCode =>
      id.hashCode +
      name.hashCode +
      (avatarKey == null ? 0 : avatarKey.hashCode) +
      isAdult.hashCode;

  factory ChatAuthorDto.fromJson(Map<String, dynamic> json) =>
      _$ChatAuthorDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ChatAuthorDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
