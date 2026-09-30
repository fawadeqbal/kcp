// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$QuizDtoCWProxy {
  QuizDto id(String id);

  QuizDto lessonId(String lessonId);

  QuizDto kind(QuizDtoKindEnum kind);

  QuizDto xp(num xp);

  QuizDto codeLanguage(String? codeLanguage);

  QuizDto prompt(String prompt);

  QuizDto lines(List<QuizLineDto> lines);

  QuizDto options(List<QuizOptionDto> options);

  QuizDto solved(bool solved);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizDto call({
    String id,
    String lessonId,
    QuizDtoKindEnum kind,
    num xp,
    String? codeLanguage,
    String prompt,
    List<QuizLineDto> lines,
    List<QuizOptionDto> options,
    bool solved,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfQuizDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfQuizDto.copyWith.fieldName(...)`
class _$QuizDtoCWProxyImpl implements _$QuizDtoCWProxy {
  const _$QuizDtoCWProxyImpl(this._value);

  final QuizDto _value;

  @override
  QuizDto id(String id) => this(id: id);

  @override
  QuizDto lessonId(String lessonId) => this(lessonId: lessonId);

  @override
  QuizDto kind(QuizDtoKindEnum kind) => this(kind: kind);

  @override
  QuizDto xp(num xp) => this(xp: xp);

  @override
  QuizDto codeLanguage(String? codeLanguage) =>
      this(codeLanguage: codeLanguage);

  @override
  QuizDto prompt(String prompt) => this(prompt: prompt);

  @override
  QuizDto lines(List<QuizLineDto> lines) => this(lines: lines);

  @override
  QuizDto options(List<QuizOptionDto> options) => this(options: options);

  @override
  QuizDto solved(bool solved) => this(solved: solved);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? lessonId = const $CopyWithPlaceholder(),
    Object? kind = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? codeLanguage = const $CopyWithPlaceholder(),
    Object? prompt = const $CopyWithPlaceholder(),
    Object? lines = const $CopyWithPlaceholder(),
    Object? options = const $CopyWithPlaceholder(),
    Object? solved = const $CopyWithPlaceholder(),
  }) {
    return QuizDto(
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
          : kind as QuizDtoKindEnum,
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
    );
  }
}

extension $QuizDtoCopyWith on QuizDto {
  /// Returns a callable class that can be used as follows: `instanceOfQuizDto.copyWith(...)` or like so:`instanceOfQuizDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$QuizDtoCWProxy get copyWith => _$QuizDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

QuizDto _$QuizDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('QuizDto', json, ($checkedConvert) {
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
        ],
      );
      final val = QuizDto(
        id: $checkedConvert('id', (v) => v as String),
        lessonId: $checkedConvert('lessonId', (v) => v as String),
        kind: $checkedConvert(
          'kind',
          (v) => $enumDecode(
            _$QuizDtoKindEnumEnumMap,
            v,
            unknownValue: QuizDtoKindEnum.unknownDefaultOpenApi,
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
      );
      return val;
    });

Map<String, dynamic> _$QuizDtoToJson(QuizDto instance) => <String, dynamic>{
  'id': instance.id,
  'lessonId': instance.lessonId,
  'kind': _$QuizDtoKindEnumEnumMap[instance.kind]!,
  'xp': instance.xp,
  'codeLanguage': instance.codeLanguage,
  'prompt': instance.prompt,
  'lines': instance.lines.map((e) => e.toJson()).toList(),
  'options': instance.options.map((e) => e.toJson()).toList(),
  'solved': instance.solved,
};

const _$QuizDtoKindEnumEnumMap = {
  QuizDtoKindEnum.BUG: 'BUG',
  QuizDtoKindEnum.ORDER: 'ORDER',
  QuizDtoKindEnum.OUTPUT: 'OUTPUT',
  QuizDtoKindEnum.CHOICE: 'CHOICE',
  QuizDtoKindEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
