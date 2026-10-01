// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pairing_info_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PairingInfoDtoCWProxy {
  PairingInfoDto device(String device);

  PairingInfoDto createdAt(DateTime createdAt);

  PairingInfoDto expiresAt(DateTime expiresAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingInfoDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingInfoDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingInfoDto call({String device, DateTime createdAt, DateTime expiresAt});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPairingInfoDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPairingInfoDto.copyWith.fieldName(...)`
class _$PairingInfoDtoCWProxyImpl implements _$PairingInfoDtoCWProxy {
  const _$PairingInfoDtoCWProxyImpl(this._value);

  final PairingInfoDto _value;

  @override
  PairingInfoDto device(String device) => this(device: device);

  @override
  PairingInfoDto createdAt(DateTime createdAt) => this(createdAt: createdAt);

  @override
  PairingInfoDto expiresAt(DateTime expiresAt) => this(expiresAt: expiresAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingInfoDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingInfoDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingInfoDto call({
    Object? device = const $CopyWithPlaceholder(),
    Object? createdAt = const $CopyWithPlaceholder(),
    Object? expiresAt = const $CopyWithPlaceholder(),
  }) {
    return PairingInfoDto(
      device: device == const $CopyWithPlaceholder()
          ? _value.device
          // ignore: cast_nullable_to_non_nullable
          : device as String,
      createdAt: createdAt == const $CopyWithPlaceholder()
          ? _value.createdAt
          // ignore: cast_nullable_to_non_nullable
          : createdAt as DateTime,
      expiresAt: expiresAt == const $CopyWithPlaceholder()
          ? _value.expiresAt
          // ignore: cast_nullable_to_non_nullable
          : expiresAt as DateTime,
    );
  }
}

extension $PairingInfoDtoCopyWith on PairingInfoDto {
  /// Returns a callable class that can be used as follows: `instanceOfPairingInfoDto.copyWith(...)` or like so:`instanceOfPairingInfoDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PairingInfoDtoCWProxy get copyWith => _$PairingInfoDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PairingInfoDto _$PairingInfoDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('PairingInfoDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['device', 'createdAt', 'expiresAt']);
  final val = PairingInfoDto(
    device: $checkedConvert('device', (v) => v as String),
    createdAt: $checkedConvert('createdAt', (v) => DateTime.parse(v as String)),
    expiresAt: $checkedConvert('expiresAt', (v) => DateTime.parse(v as String)),
  );
  return val;
});

Map<String, dynamic> _$PairingInfoDtoToJson(PairingInfoDto instance) =>
    <String, dynamic>{
      'device': instance.device,
      'createdAt': instance.createdAt.toIso8601String(),
      'expiresAt': instance.expiresAt.toIso8601String(),
    };
