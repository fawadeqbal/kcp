//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'quiz_reveal_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class QuizRevealDto {
  /// Returns a new [QuizRevealDto] instance.
  QuizRevealDto({
    required this.order,

    required this.line,

    required this.option,
  });

  @JsonKey(name: r'order', required: true, includeIfNull: true)
  final List<String>? order;

  @JsonKey(name: r'line', required: true, includeIfNull: true)
  final num? line;

  @JsonKey(name: r'option', required: true, includeIfNull: true)
  final String? option;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuizRevealDto &&
          other.order == order &&
          other.line == line &&
          other.option == option;

  @override
  int get hashCode =>
      (order == null ? 0 : order.hashCode) +
      (line == null ? 0 : line.hashCode) +
      (option == null ? 0 : option.hashCode);

  factory QuizRevealDto.fromJson(Map<String, dynamic> json) =>
      _$QuizRevealDtoFromJson(json);

  Map<String, dynamic> toJson() => _$QuizRevealDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
