// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'practice_quiz_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PracticeQuizDtoCWProxy {
  PracticeQuizDto id(String id);

  PracticeQuizDto lessonId(String lessonId);

  PracticeQuizDto kind(PracticeQuizDtoKindEnum kind);

  PracticeQuizDto xp(num xp);

  PracticeQuizDto codeLanguage(String? codeLanguage);

  PracticeQuizDto prompt(String prompt);

  PracticeQuizDto lines(List<QuizLineDto> lines);

  PracticeQuizDto options(List<QuizOptionDto> options);

  PracticeQuizDto solved(bool solved);

  PracticeQuizDto lessonTitle(String lessonTitle);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PracticeQuizDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PracticeQuizDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PracticeQuizDto call({
    String id,
    String lessonId,
    PracticeQuizDtoKindEnum kind,
    num xp,
    String? codeLanguage,
    String prompt,
    List<QuizLineDto> lines,
    List<QuizOptionDto> options,
    bool solved,
    String lessonTitle,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPracticeQuizDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPracticeQuizDto.copyWith.fieldName(...)`
class _$PracticeQuizDtoCWProxyImpl implements _$PracticeQuizDtoCWProxy {
  const _$PracticeQuizDtoCWProxyImpl(this._value);

  final PracticeQuizDto _value;

  @override
  PracticeQuizDto id(String id) => this(id: id);

  @override
  PracticeQuizDto lessonId(String lessonId) => this(lessonId: lessonId);

  @override
  PracticeQuizDto kind(PracticeQuizDtoKindEnum kind) => this(kind: kind);

  @override
  PracticeQuizDto xp(num xp) => this(xp: xp);

  @override
  PracticeQuizDto codeLanguage(String? codeLanguage) =>
      this(codeLanguage: codeLanguage);

  @override
  PracticeQuizDto prompt(String prompt) => this(prompt: prompt);

  @override
  PracticeQuizDto lines(List<QuizLineDto> lines) => this(lines: lines);

  @override
  PracticeQuizDto options(List<QuizOptionDto> options) =>
      this(options: options);

  @override
  PracticeQuizDto solved(bool solved) => this(solved: solved);

  @override
  PracticeQuizDto lessonTitle(String lessonTitle) =>
      this(lessonTitle: lessonTitle);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PracticeQuizDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PracticeQuizDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PracticeQuizDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? lessonId = const $CopyWithPlaceholder(),
    Object? kind = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? codeLanguage = const $CopyWithPlaceholder(),
    Object? prompt = const $CopyWithPlaceholder(),
    Object? lines = const $CopyWithPlaceholder(),
    Object? options = const $CopyWithPlaceholder(),
    Object? solved = const $CopyWithPlaceholder(),
    Object? lessonTitle = const $CopyWithPlaceholder(),
  }) {
    return PracticeQuizDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      lessonId: lessonId == const $CopyWithPlaceholder()
          ? _value.lessonId
          // ignore: cast_nullable_to_non_nullable
          : lessonId as String,
      kind: kind == const $CopyWithPlaceholder()
          ? _value.kind
          // ignore: cast_nullable_to_non_nullable
          : kind as PracticeQuizDtoKindEnum,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      codeLanguage: codeLanguage == const $CopyWithPlaceholder()
          ? _value.codeLanguage
          // ignore: cast_nullable_to_non_nullable
          : codeLanguage as String?,
      prompt: prompt == const $CopyWithPlaceholder()
          ? _value.prompt
          // ignore: cast_nullable_to_non_nullable
          : prompt as String,
      lines: lines == const $CopyWithPlaceholder()
          ? _value.lines
          // ignore: cast_nullable_to_non_nullable
          : lines as List<QuizLineDto>,
      options: options == const $CopyWithPlaceholder()
          ? _value.options
          // ignore: cast_nullable_to_non_nullable
          : options as List<QuizOptionDto>,
      solved: solved == const $CopyWithPlaceholder()
          ? _value.solved
          // ignore: cast_nullable_to_non_nullable
          : solved as bool,
      lessonTitle: lessonTitle == const $CopyWithPlaceholder()
          ? _value.lessonTitle
          // ignore: cast_nullable_to_non_nullable
          : lessonTitle as String,
    );
  }
}

extension $PracticeQuizDtoCopyWith on PracticeQuizDto {
  /// Returns a callable class that can be used as follows: `instanceOfPracticeQuizDto.copyWith(...)` or like so:`instanceOfPracticeQuizDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PracticeQuizDtoCWProxy get copyWith => _$PracticeQuizDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PracticeQuizDto _$PracticeQuizDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PracticeQuizDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'lessonId',
          'kind',
          'xp',
          'codeLanguage',
          'prompt',
          'lines',
          'options',
          'solved',
          'lessonTitle',
        ],
      );
      final val = PracticeQuizDto(
        id: $checkedConvert('id', (v) => v as String),
        lessonId: $checkedConvert('lessonId', (v) => v as String),
        kind: $checkedConvert(
          'kind',
          (v) => $enumDecode(
            _$PracticeQuizDtoKindEnumEnumMap,
            v,
            unknownValue: PracticeQuizDtoKindEnum.unknownDefaultOpenApi,
          ),
        ),
        xp: $checkedConvert('xp', (v) => v as num),
        codeLanguage: $checkedConvert('codeLanguage', (v) => v as String?),
        prompt: $checkedConvert('prompt', (v) => v as String),
        lines: $checkedConvert(
          'lines',
          (v) => (v as List<dynamic>)
              .map((e) => QuizLineDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        options: $checkedConvert(
          'options',
          (v) => (v as List<dynamic>)
              .map((e) => QuizOptionDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        solved: $checkedConvert('solved', (v) => v as bool),
        lessonTitle: $checkedConvert('lessonTitle', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$PracticeQuizDtoToJson(PracticeQuizDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'lessonId': instance.lessonId,
      'kind': _$PracticeQuizDtoKindEnumEnumMap[instance.kind]!,
      'xp': instance.xp,
      'codeLanguage': instance.codeLanguage,
      'prompt': instance.prompt,
      'lines': instance.lines.map((e) => e.toJson()).toList(),
      'options': instance.options.map((e) => e.toJson()).toList(),
      'solved': instance.solved,
      'lessonTitle': instance.lessonTitle,
    };

const _$PracticeQuizDtoKindEnumEnumMap = {
  PracticeQuizDtoKindEnum.BUG: 'BUG',
  PracticeQuizDtoKindEnum.ORDER: 'ORDER',
  PracticeQuizDtoKindEnum.OUTPUT: 'OUTPUT',
  PracticeQuizDtoKindEnum.CHOICE: 'CHOICE',
  PracticeQuizDtoKindEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
