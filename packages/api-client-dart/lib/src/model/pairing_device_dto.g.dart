// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pairing_device_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PairingDeviceDtoCWProxy {
  PairingDeviceDto pairingId(String pairingId);

  PairingDeviceDto secret(String secret);

  PairingDeviceDto tokenDelivery(
    PairingDeviceDtoTokenDeliveryEnum? tokenDelivery,
  );

  PairingDeviceDto app(PairingDeviceDtoAppEnum? app);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingDeviceDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingDeviceDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingDeviceDto call({
    String pairingId,
    String secret,
    PairingDeviceDtoTokenDeliveryEnum? tokenDelivery,
    PairingDeviceDtoAppEnum? app,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPairingDeviceDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPairingDeviceDto.copyWith.fieldName(...)`
class _$PairingDeviceDtoCWProxyImpl implements _$PairingDeviceDtoCWProxy {
  const _$PairingDeviceDtoCWProxyImpl(this._value);

  final PairingDeviceDto _value;

  @override
  PairingDeviceDto pairingId(String pairingId) => this(pairingId: pairingId);

  @override
  PairingDeviceDto secret(String secret) => this(secret: secret);

  @override
  PairingDeviceDto tokenDelivery(
    PairingDeviceDtoTokenDeliveryEnum? tokenDelivery,
  ) => this(tokenDelivery: tokenDelivery);

  @override
  PairingDeviceDto app(PairingDeviceDtoAppEnum? app) => this(app: app);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingDeviceDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingDeviceDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingDeviceDto call({
    Object? pairingId = const $CopyWithPlaceholder(),
    Object? secret = const $CopyWithPlaceholder(),
    Object? tokenDelivery = const $CopyWithPlaceholder(),
    Object? app = const $CopyWithPlaceholder(),
  }) {
    return PairingDeviceDto(
      pairingId: pairingId == const $CopyWithPlaceholder()
          ? _value.pairingId
          // ignore: cast_nullable_to_non_nullable
          : pairingId as String,
      secret: secret == const $CopyWithPlaceholder()
          ? _value.secret
          // ignore: cast_nullable_to_non_nullable
          : secret as String,
      tokenDelivery: tokenDelivery == const $CopyWithPlaceholder()
          ? _value.tokenDelivery
          // ignore: cast_nullable_to_non_nullable
          : tokenDelivery as PairingDeviceDtoTokenDeliveryEnum?,
      app: app == const $CopyWithPlaceholder()
          ? _value.app
          // ignore: cast_nullable_to_non_nullable
          : app as PairingDeviceDtoAppEnum?,
    );
  }
}

extension $PairingDeviceDtoCopyWith on PairingDeviceDto {
  /// Returns a callable class that can be used as follows: `instanceOfPairingDeviceDto.copyWith(...)` or like so:`instanceOfPairingDeviceDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PairingDeviceDtoCWProxy get copyWith => _$PairingDeviceDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PairingDeviceDto _$PairingDeviceDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PairingDeviceDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['pairingId', 'secret']);
      final val = PairingDeviceDto(
        pairingId: $checkedConvert('pairingId', (v) => v as String),
        secret: $checkedConvert('secret', (v) => v as String),
        tokenDelivery: $checkedConvert(
          'tokenDelivery',
          (v) => $enumDecodeNullable(
            _$PairingDeviceDtoTokenDeliveryEnumEnumMap,
            v,
            unknownValue:
                PairingDeviceDtoTokenDeliveryEnum.unknownDefaultOpenApi,
          ),
        ),
        app: $checkedConvert(
          'app',
          (v) => $enumDecodeNullable(
            _$PairingDeviceDtoAppEnumEnumMap,
            v,
            unknownValue: PairingDeviceDtoAppEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$PairingDeviceDtoToJson(PairingDeviceDto instance) =>
    <String, dynamic>{
      'pairingId': instance.pairingId,
      'secret': instance.secret,
      'tokenDelivery':
          ?_$PairingDeviceDtoTokenDeliveryEnumEnumMap[instance.tokenDelivery],
      'app': ?_$PairingDeviceDtoAppEnumEnumMap[instance.app],
    };

const _$PairingDeviceDtoTokenDeliveryEnumEnumMap = {
  PairingDeviceDtoTokenDeliveryEnum.cookie: 'cookie',
  PairingDeviceDtoTokenDeliveryEnum.body: 'body',
  PairingDeviceDtoTokenDeliveryEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};

const _$PairingDeviceDtoAppEnumEnumMap = {
  PairingDeviceDtoAppEnum.web: 'web',
  PairingDeviceDtoAppEnum.admin: 'admin',
  PairingDeviceDtoAppEnum.mobile: 'mobile',
  PairingDeviceDtoAppEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
