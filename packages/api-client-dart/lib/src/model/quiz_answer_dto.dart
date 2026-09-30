//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'quiz_answer_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class QuizAnswerDto {
  /// Returns a new [QuizAnswerDto] instance.
  QuizAnswerDto({this.order, this.line, this.option});

  /// ORDER: the line IDs in the student's order.
  @JsonKey(name: r'order', required: false, includeIfNull: false)
  final List<String>? order;

  /// BUG: the number of the line with the mistake, from 1.
  // minimum: 1
  // maximum: 50
  @JsonKey(name: r'line', required: false, includeIfNull: false)
  final num? line;

  /// OUTPUT and CHOICE: the chosen option's ID.
  @JsonKey(name: r'option', required: false, includeIfNull: false)
  final String? option;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuizAnswerDto &&
          other.order == order &&
          other.line == line &&
          other.option == option;

  @override
  int get hashCode => order.hashCode + line.hashCode + option.hashCode;

  factory QuizAnswerDto.fromJson(Map<String, dynamic> json) =>
      _$QuizAnswerDtoFromJson(json);

  Map<String, dynamic> toJson() => _$QuizAnswerDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
