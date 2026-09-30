//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'lesson_progress_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LessonProgressDto {
  /// Returns a new [LessonProgressDto] instance.
  LessonProgressDto({required this.status});

  @JsonKey(
    name: r'status',
    required: true,
    includeIfNull: false,
    unknownEnumValue: LessonProgressDtoStatusEnum.unknownDefaultOpenApi,
  )
  final LessonProgressDtoStatusEnum status;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LessonProgressDto && other.status == status;

  @override
  int get hashCode => status.hashCode;

  factory LessonProgressDto.fromJson(Map<String, dynamic> json) =>
      _$LessonProgressDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LessonProgressDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum LessonProgressDtoStatusEnum {
  @JsonValue(r'NOT_STARTED')
  NOT_STARTED(r'NOT_STARTED'),
  @JsonValue(r'STARTED')
  STARTED(r'STARTED'),
  @JsonValue(r'COMPLETED')
  COMPLETED(r'COMPLETED'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LessonProgressDtoStatusEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
