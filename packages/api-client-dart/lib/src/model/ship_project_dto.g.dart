// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ship_project_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ShipProjectDtoCWProxy {
  ShipProjectDto code(CodeFilesDto code);

  ShipProjectDto results(List<CheckResultDto> results);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ShipProjectDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ShipProjectDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ShipProjectDto call({CodeFilesDto code, List<CheckResultDto> results});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfShipProjectDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfShipProjectDto.copyWith.fieldName(...)`
class _$ShipProjectDtoCWProxyImpl implements _$ShipProjectDtoCWProxy {
  const _$ShipProjectDtoCWProxyImpl(this._value);

  final ShipProjectDto _value;

  @override
  ShipProjectDto code(CodeFilesDto code) => this(code: code);

  @override
  ShipProjectDto results(List<CheckResultDto> results) =>
      this(results: results);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ShipProjectDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ShipProjectDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ShipProjectDto call({
    Object? code = const $CopyWithPlaceholder(),
    Object? results = const $CopyWithPlaceholder(),
  }) {
    return ShipProjectDto(
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

extension $ShipProjectDtoCopyWith on ShipProjectDto {
  /// Returns a callable class that can be used as follows: `instanceOfShipProjectDto.copyWith(...)` or like so:`instanceOfShipProjectDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ShipProjectDtoCWProxy get copyWith => _$ShipProjectDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ShipProjectDto _$ShipProjectDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ShipProjectDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['code', 'results']);
      final val = ShipProjectDto(
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

Map<String, dynamic> _$ShipProjectDtoToJson(ShipProjectDto instance) =>
    <String, dynamic>{
      'code': instance.code.toJson(),
      'results': instance.results.map((e) => e.toJson()).toList(),
    };
