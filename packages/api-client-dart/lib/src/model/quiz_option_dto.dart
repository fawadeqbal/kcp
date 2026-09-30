//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'quiz_option_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class QuizOptionDto {
  /// Returns a new [QuizOptionDto] instance.
  QuizOptionDto({required this.id, required this.text, required this.code});

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  /// Text in the student's language, or null when the option is code.
  @JsonKey(name: r'text', required: true, includeIfNull: true)
  final String? text;

  /// Code, shown as it is in every language, or null for a text option.
  @JsonKey(name: r'code', required: true, includeIfNull: true)
  final String? code;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuizOptionDto &&
          other.id == id &&
          other.text == text &&
          other.code == code;

  @override
  int get hashCode =>
      id.hashCode +
      (text == null ? 0 : text.hashCode) +
      (code == null ? 0 : code.hashCode);

  factory QuizOptionDto.fromJson(Map<String, dynamic> json) =>
      _$QuizOptionDtoFromJson(json);

  Map<String, dynamic> toJson() => _$QuizOptionDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
