// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_answer_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$QuizAnswerDtoCWProxy {
  QuizAnswerDto order(List<String>? order);

  QuizAnswerDto line(num? line);

  QuizAnswerDto option(String? option);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizAnswerDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizAnswerDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizAnswerDto call({List<String>? order, num? line, String? option});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfQuizAnswerDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfQuizAnswerDto.copyWith.fieldName(...)`
class _$QuizAnswerDtoCWProxyImpl implements _$QuizAnswerDtoCWProxy {
  const _$QuizAnswerDtoCWProxyImpl(this._value);

  final QuizAnswerDto _value;

  @override
  QuizAnswerDto order(List<String>? order) => this(order: order);

  @override
  QuizAnswerDto line(num? line) => this(line: line);

  @override
  QuizAnswerDto option(String? option) => this(option: option);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizAnswerDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizAnswerDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizAnswerDto call({
    Object? order = const $CopyWithPlaceholder(),
    Object? line = const $CopyWithPlaceholder(),
    Object? option = const $CopyWithPlaceholder(),
  }) {
    return QuizAnswerDto(
      order: order == const $CopyWithPlaceholder()
          ? _value.order
          // ignore: cast_nullable_to_non_nullable
          : order as List<String>?,
      line: line == const $CopyWithPlaceholder()
          ? _value.line
          // ignore: cast_nullable_to_non_nullable
          : line as num?,
      option: option == const $CopyWithPlaceholder()
          ? _value.option
          // ignore: cast_nullable_to_non_nullable
          : option as String?,
    );
  }
}

extension $QuizAnswerDtoCopyWith on QuizAnswerDto {
  /// Returns a callable class that can be used as follows: `instanceOfQuizAnswerDto.copyWith(...)` or like so:`instanceOfQuizAnswerDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$QuizAnswerDtoCWProxy get copyWith => _$QuizAnswerDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

QuizAnswerDto _$QuizAnswerDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('QuizAnswerDto', json, ($checkedConvert) {
      final val = QuizAnswerDto(
        order: $checkedConvert(
          'order',
          (v) => (v as List<dynamic>?)?.map((e) => e as String).toList(),
        ),
        line: $checkedConvert('line', (v) => v as num?),
        option: $checkedConvert('option', (v) => v as String?),
      );
      return val;
    });

Map<String, dynamic> _$QuizAnswerDtoToJson(QuizAnswerDto instance) =>
    <String, dynamic>{
      'order': ?instance.order,
      'line': ?instance.line,
      'option': ?instance.option,
    };
