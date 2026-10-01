// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pairing_code_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PairingCodeDtoCWProxy {
  PairingCodeDto code(String code);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingCodeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingCodeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingCodeDto call({String code});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPairingCodeDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPairingCodeDto.copyWith.fieldName(...)`
class _$PairingCodeDtoCWProxyImpl implements _$PairingCodeDtoCWProxy {
  const _$PairingCodeDtoCWProxyImpl(this._value);

  final PairingCodeDto _value;

  @override
  PairingCodeDto code(String code) => this(code: code);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingCodeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingCodeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingCodeDto call({Object? code = const $CopyWithPlaceholder()}) {
    return PairingCodeDto(
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as String,
    );
  }
}

extension $PairingCodeDtoCopyWith on PairingCodeDto {
  /// Returns a callable class that can be used as follows: `instanceOfPairingCodeDto.copyWith(...)` or like so:`instanceOfPairingCodeDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PairingCodeDtoCWProxy get copyWith => _$PairingCodeDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PairingCodeDto _$PairingCodeDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PairingCodeDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['code']);
      final val = PairingCodeDto(
        code: $checkedConvert('code', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$PairingCodeDtoToJson(PairingCodeDto instance) =>
    <String, dynamic>{'code': instance.code};
