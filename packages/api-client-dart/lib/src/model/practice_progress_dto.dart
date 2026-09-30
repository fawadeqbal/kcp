//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'practice_progress_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PracticeProgressDto {
  /// Returns a new [PracticeProgressDto] instance.
  PracticeProgressDto({
    required this.day,

    required this.total,

    required this.answered,

    required this.done,
  });

  /// The student's day, e.g. \"2026-10-01\".
  @JsonKey(name: r'day', required: true, includeIfNull: false)
  final String day;

  @JsonKey(name: r'total', required: true, includeIfNull: false)
  final num total;

  @JsonKey(name: r'answered', required: true, includeIfNull: false)
  final num answered;

  @JsonKey(name: r'done', required: true, includeIfNull: false)
  final bool done;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PracticeProgressDto &&
          other.day == day &&
          other.total == total &&
          other.answered == answered &&
          other.done == done;

  @override
  int get hashCode =>
      day.hashCode + total.hashCode + answered.hashCode + done.hashCode;

  factory PracticeProgressDto.fromJson(Map<String, dynamic> json) =>
      _$PracticeProgressDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PracticeProgressDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
