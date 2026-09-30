// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_option_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$QuizOptionDtoCWProxy {
  QuizOptionDto id(String id);

  QuizOptionDto text(String? text);

  QuizOptionDto code(String? code);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizOptionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizOptionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizOptionDto call({String id, String? text, String? code});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfQuizOptionDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfQuizOptionDto.copyWith.fieldName(...)`
class _$QuizOptionDtoCWProxyImpl implements _$QuizOptionDtoCWProxy {
  const _$QuizOptionDtoCWProxyImpl(this._value);

  final QuizOptionDto _value;

  @override
  QuizOptionDto id(String id) => this(id: id);

  @override
  QuizOptionDto text(String? text) => this(text: text);

  @override
  QuizOptionDto code(String? code) => this(code: code);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizOptionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizOptionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizOptionDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? text = const $CopyWithPlaceholder(),
    Object? code = const $CopyWithPlaceholder(),
  }) {
    return QuizOptionDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      text: text == const $CopyWithPlaceholder()
          ? _value.text
          // ignore: cast_nullable_to_non_nullable
          : text as String?,
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as String?,
    );
  }
}

extension $QuizOptionDtoCopyWith on QuizOptionDto {
  /// Returns a callable class that can be used as follows: `instanceOfQuizOptionDto.copyWith(...)` or like so:`instanceOfQuizOptionDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$QuizOptionDtoCWProxy get copyWith => _$QuizOptionDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

QuizOptionDto _$QuizOptionDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('QuizOptionDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['id', 'text', 'code']);
      final val = QuizOptionDto(
        id: $checkedConvert('id', (v) => v as String),
        text: $checkedConvert('text', (v) => v as String?),
        code: $checkedConvert('code', (v) => v as String?),
      );
      return val;
    });

Map<String, dynamic> _$QuizOptionDtoToJson(QuizOptionDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'text': instance.text,
      'code': instance.code,
    };
