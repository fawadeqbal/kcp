//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_event_request_dto_child.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentEventRequestDtoChild {
  /// Returns a new [ParentEventRequestDtoChild] instance.
  ParentEventRequestDtoChild({
    required this.id,

    required this.nickname,

    required this.avatarKey,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'nickname', required: true, includeIfNull: false)
  final String nickname;

  @JsonKey(name: r'avatarKey', required: true, includeIfNull: false)
  final String avatarKey;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentEventRequestDtoChild &&
          other.id == id &&
          other.nickname == nickname &&
          other.avatarKey == avatarKey;

  @override
  int get hashCode => id.hashCode + nickname.hashCode + avatarKey.hashCode;

  factory ParentEventRequestDtoChild.fromJson(Map<String, dynamic> json) =>
      _$ParentEventRequestDtoChildFromJson(json);

  Map<String, dynamic> toJson() => _$ParentEventRequestDtoChildToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
