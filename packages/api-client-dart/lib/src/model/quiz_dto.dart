//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/quiz_line_dto.dart';
import 'package:kcp_api/src/model/quiz_option_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'quiz_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class QuizDto {
  /// Returns a new [QuizDto] instance.
  QuizDto({
    required this.id,

    required this.lessonId,

    required this.kind,

    required this.xp,

    required this.codeLanguage,

    required this.prompt,

    required this.lines,

    required this.options,

    required this.solved,
  });

  @JsonKey(name: r'id', required: true, includeIfNull: false)
  final String id;

  @JsonKey(name: r'lessonId', required: true, includeIfNull: false)
  final String lessonId;

  /// ORDER: put `lines` in order and send their IDs back. BUG: tap the line with the mistake (send its number). OUTPUT: pick what the code shows. CHOICE: pick the right answer.
  @JsonKey(
    name: r'kind',
    required: true,
    includeIfNull: false,
    unknownEnumValue: QuizDtoKindEnum.unknownDefaultOpenApi,
  )
  final QuizDtoKindEnum kind;

  @JsonKey(name: r'xp', required: true, includeIfNull: false)
  final num xp;

  /// html, css, js or python: how to colour the code.
  @JsonKey(name: r'codeLanguage', required: true, includeIfNull: true)
  final String? codeLanguage;

  @JsonKey(name: r'prompt', required: true, includeIfNull: false)
  final String prompt;

  /// ORDER: the lines, shuffled. BUG, OUTPUT and CHOICE: the code as it is (the ID is the line number). Empty when the quiz has no code.
  @JsonKey(name: r'lines', required: true, includeIfNull: false)
  final List<QuizLineDto> lines;

  @JsonKey(name: r'options', required: true, includeIfNull: false)
  final List<QuizOptionDto> options;

  /// The student has answered it correctly before.
  @JsonKey(name: r'solved', required: true, includeIfNull: false)
  final bool solved;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is QuizDto &&
          other.id == id &&
          other.lessonId == lessonId &&
          other.kind == kind &&
          other.xp == xp &&
          other.codeLanguage == codeLanguage &&
          other.prompt == prompt &&
          other.lines == lines &&
          other.options == options &&
          other.solved == solved;

  @override
  int get hashCode =>
      id.hashCode +
      lessonId.hashCode +
      kind.hashCode +
      xp.hashCode +
      (codeLanguage == null ? 0 : codeLanguage.hashCode) +
      prompt.hashCode +
      lines.hashCode +
      options.hashCode +
      solved.hashCode;

  factory QuizDto.fromJson(Map<String, dynamic> json) =>
      _$QuizDtoFromJson(json);

  Map<String, dynamic> toJson() => _$QuizDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// ORDER: put `lines` in order and send their IDs back. BUG: tap the line with the mistake (send its number). OUTPUT: pick what the code shows. CHOICE: pick the right answer.
enum QuizDtoKindEnum {
  @JsonValue(r'BUG')
  BUG(r'BUG'),
  @JsonValue(r'ORDER')
  ORDER(r'ORDER'),
  @JsonValue(r'OUTPUT')
  OUTPUT(r'OUTPUT'),
  @JsonValue(r'CHOICE')
  CHOICE(r'CHOICE'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const QuizDtoKindEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
