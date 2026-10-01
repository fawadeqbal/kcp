// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'submit_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SubmitDtoCWProxy {
  SubmitDto code(CodeFilesDto code);

  SubmitDto results(List<CheckResultDto> results);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SubmitDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SubmitDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SubmitDto call({CodeFilesDto code, List<CheckResultDto> results});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSubmitDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSubmitDto.copyWith.fieldName(...)`
class _$SubmitDtoCWProxyImpl implements _$SubmitDtoCWProxy {
  const _$SubmitDtoCWProxyImpl(this._value);

  final SubmitDto _value;

  @override
  SubmitDto code(CodeFilesDto code) => this(code: code);

  @override
  SubmitDto results(List<CheckResultDto> results) => this(results: results);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SubmitDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SubmitDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SubmitDto call({
    Object? code = const $CopyWithPlaceholder(),
    Object? results = const $CopyWithPlaceholder(),
  }) {
    return SubmitDto(
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as CodeFilesDto,
      results: results == const $CopyWithPlaceholder()
          ? _value.results
          // ignore: cast_nullable_to_non_nullable
          : results as List<CheckResultDto>,
    );
  }
}

extension $SubmitDtoCopyWith on SubmitDto {
  /// Returns a callable class that can be used as follows: `instanceOfSubmitDto.copyWith(...)` or like so:`instanceOfSubmitDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SubmitDtoCWProxy get copyWith => _$SubmitDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SubmitDto _$SubmitDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SubmitDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['code', 'results']);
      final val = SubmitDto(
        code: $checkedConvert(
          'code',
          (v) => CodeFilesDto.fromJson(v as Map<String, dynamic>),
        ),
        results: $checkedConvert(
          'results',
          (v) => (v as List<dynamic>)
              .map((e) => CheckResultDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$SubmitDtoToJson(SubmitDto instance) => <String, dynamic>{
  'code': instance.code.toJson(),
  'results': instance.results.map((e) => e.toJson()).toList(),
};
