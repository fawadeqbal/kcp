//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/parent_event_request_dto_child.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'parent_class_request_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ParentClassRequestDto {
  /// Returns a new [ParentClassRequestDto] instance.
  ParentClassRequestDto({
    required this.classId,

    required this.child,

    required this.className,

    required this.school,

    required this.teacher,

    required this.requestedAt,
  });

  @JsonKey(name: r'classId', required: true, includeIfNull: false)
  final String classId;

  @JsonKey(name: r'child', required: true, includeIfNull: false)
  final ParentEventRequestDtoChild child;

  @JsonKey(name: r'className', required: true, includeIfNull: false)
  final String className;

  @JsonKey(name: r'school', required: true, includeIfNull: false)
  final String school;

  @JsonKey(name: r'teacher', required: true, includeIfNull: false)
  final String teacher;

  @JsonKey(name: r'requestedAt', required: true, includeIfNull: false)
  final DateTime requestedAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ParentClassRequestDto &&
          other.classId == classId &&
          other.child == child &&
          other.className == className &&
          other.school == school &&
          other.teacher == teacher &&
          other.requestedAt == requestedAt;

  @override
  int get hashCode =>
      classId.hashCode +
      child.hashCode +
      className.hashCode +
      school.hashCode +
      teacher.hashCode +
      requestedAt.hashCode;

  factory ParentClassRequestDto.fromJson(Map<String, dynamic> json) =>
      _$ParentClassRequestDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ParentClassRequestDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
