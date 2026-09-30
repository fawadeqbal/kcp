// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_line_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$QuizLineDtoCWProxy {
  QuizLineDto id(String id);

  QuizLineDto text(String text);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizLineDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizLineDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizLineDto call({String id, String text});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfQuizLineDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfQuizLineDto.copyWith.fieldName(...)`
class _$QuizLineDtoCWProxyImpl implements _$QuizLineDtoCWProxy {
  const _$QuizLineDtoCWProxyImpl(this._value);

  final QuizLineDto _value;

  @override
  QuizLineDto id(String id) => this(id: id);

  @override
  QuizLineDto text(String text) => this(text: text);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizLineDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizLineDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizLineDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? text = const $CopyWithPlaceholder(),
  }) {
    return QuizLineDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      text: text == const $CopyWithPlaceholder()
          ? _value.text
          // ignore: cast_nullable_to_non_nullable
          : text as String,
    );
  }
}

extension $QuizLineDtoCopyWith on QuizLineDto {
  /// Returns a callable class that can be used as follows: `instanceOfQuizLineDto.copyWith(...)` or like so:`instanceOfQuizLineDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$QuizLineDtoCWProxy get copyWith => _$QuizLineDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

QuizLineDto _$QuizLineDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('QuizLineDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['id', 'text']);
      final val = QuizLineDto(
        id: $checkedConvert('id', (v) => v as String),
        text: $checkedConvert('text', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$QuizLineDtoToJson(QuizLineDto instance) =>
    <String, dynamic>{'id': instance.id, 'text': instance.text};
