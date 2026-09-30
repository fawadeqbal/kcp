// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_reveal_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$QuizRevealDtoCWProxy {
  QuizRevealDto order(List<String>? order);

  QuizRevealDto line(num? line);

  QuizRevealDto option(String? option);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizRevealDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizRevealDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizRevealDto call({List<String>? order, num? line, String? option});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfQuizRevealDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfQuizRevealDto.copyWith.fieldName(...)`
class _$QuizRevealDtoCWProxyImpl implements _$QuizRevealDtoCWProxy {
  const _$QuizRevealDtoCWProxyImpl(this._value);

  final QuizRevealDto _value;

  @override
  QuizRevealDto order(List<String>? order) => this(order: order);

  @override
  QuizRevealDto line(num? line) => this(line: line);

  @override
  QuizRevealDto option(String? option) => this(option: option);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizRevealDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizRevealDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizRevealDto call({
    Object? order = const $CopyWithPlaceholder(),
    Object? line = const $CopyWithPlaceholder(),
    Object? option = const $CopyWithPlaceholder(),
  }) {
    return QuizRevealDto(
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

extension $QuizRevealDtoCopyWith on QuizRevealDto {
  /// Returns a callable class that can be used as follows: `instanceOfQuizRevealDto.copyWith(...)` or like so:`instanceOfQuizRevealDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$QuizRevealDtoCWProxy get copyWith => _$QuizRevealDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

QuizRevealDto _$QuizRevealDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('QuizRevealDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['order', 'line', 'option']);
      final val = QuizRevealDto(
        order: $checkedConvert(
          'order',
          (v) => (v as List<dynamic>?)?.map((e) => e as String).toList(),
        ),
        line: $checkedConvert('line', (v) => v as num?),
        option: $checkedConvert('option', (v) => v as String?),
      );
      return val;
    });

Map<String, dynamic> _$QuizRevealDtoToJson(QuizRevealDto instance) =>
    <String, dynamic>{
      'order': instance.order,
      'line': instance.line,
      'option': instance.option,
    };
