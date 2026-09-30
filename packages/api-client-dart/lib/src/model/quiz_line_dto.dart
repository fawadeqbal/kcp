//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'quiz_line_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class QuizLineDto {
  /// Returns a new [QuizLineDto] instance.
  QuizLineDto({required this.id, required this.text});

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'text', required: true, includeIfNull: false)
  final String text;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuizLineDto && other.id == id && other.text == text;

  @override
  int get hashCode => id.hashCode + text.hashCode;

  factory QuizLineDto.fromJson(Map<String, dynamic> json) =>
      _$QuizLineDtoFromJson(json);

  Map<String, dynamic> toJson() => _$QuizLineDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
