// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'check_result_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$CheckResultDtoCWProxy {
  CheckResultDto id(String id);

  CheckResultDto passed(bool passed);

  CheckResultDto hint(String? hint);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CheckResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CheckResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CheckResultDto call({String id, bool passed, String? hint});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfCheckResultDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfCheckResultDto.copyWith.fieldName(...)`
class _$CheckResultDtoCWProxyImpl implements _$CheckResultDtoCWProxy {
  const _$CheckResultDtoCWProxyImpl(this._value);

  final CheckResultDto _value;

  @override
  CheckResultDto id(String id) => this(id: id);

  @override
  CheckResultDto passed(bool passed) => this(passed: passed);

  @override
  CheckResultDto hint(String? hint) => this(hint: hint);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `CheckResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// CheckResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  CheckResultDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? passed = const $CopyWithPlaceholder(),
    Object? hint = const $CopyWithPlaceholder(),
  }) {
    return CheckResultDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      passed: passed == const $CopyWithPlaceholder()
          ? _value.passed
          // ignore: cast_nullable_to_non_nullable
          : passed as bool,
      hint: hint == const $CopyWithPlaceholder()
          ? _value.hint
          // ignore: cast_nullable_to_non_nullable
          : hint as String?,
    );
  }
}

extension $CheckResultDtoCopyWith on CheckResultDto {
  /// Returns a callable class that can be used as follows: `instanceOfCheckResultDto.copyWith(...)` or like so:`instanceOfCheckResultDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$CheckResultDtoCWProxy get copyWith => _$CheckResultDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CheckResultDto _$CheckResultDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('CheckResultDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['id', 'passed']);
      final val = CheckResultDto(
        id: $checkedConvert('id', (v) => v as String),
        passed: $checkedConvert('passed', (v) => v as bool),
        hint: $checkedConvert('hint', (v) => v as String?),
      );
      return val;
    });

Map<String, dynamic> _$CheckResultDtoToJson(CheckResultDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'passed': instance.passed,
      'hint': ?instance.hint,
    };
