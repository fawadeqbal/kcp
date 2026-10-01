//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'pairing_device_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PairingDeviceDto {
  /// Returns a new [PairingDeviceDto] instance.
  PairingDeviceDto({
    required this.pairingId,

    required this.secret,

    this.tokenDelivery,

    this.app,
  });

  @JsonKey(name: r'pairingId', required: true, includeIfNull: false)
  final String pairingId;

  @JsonKey(name: r'secret', required: true, includeIfNull: false)
  final String secret;

  /// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
  @JsonKey(
    name: r'tokenDelivery',
    required: false,
    includeIfNull: false,
    unknownEnumValue: PairingDeviceDtoTokenDeliveryEnum.unknownDefaultOpenApi,
  )
  final PairingDeviceDtoTokenDeliveryEnum? tokenDelivery;

  /// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
  @JsonKey(
    name: r'app',
    required: false,
    includeIfNull: false,
    unknownEnumValue: PairingDeviceDtoAppEnum.unknownDefaultOpenApi,
  )
  final PairingDeviceDtoAppEnum? app;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PairingDeviceDto &&
          other.pairingId == pairingId &&
          other.secret == secret &&
          other.tokenDelivery == tokenDelivery &&
          other.app == app;

  @override
  int get hashCode =>
      pairingId.hashCode +
      secret.hashCode +
      tokenDelivery.hashCode +
      app.hashCode;

  factory PairingDeviceDto.fromJson(Map<String, dynamic> json) =>
      _$PairingDeviceDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PairingDeviceDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
enum PairingDeviceDtoTokenDeliveryEnum {
  @JsonValue(r'cookie')
  cookie(r'cookie'),
  @JsonValue(r'body')
  body(r'body'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PairingDeviceDtoTokenDeliveryEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
enum PairingDeviceDtoAppEnum {
  @JsonValue(r'web')
  web(r'web'),
  @JsonValue(r'admin')
  admin(r'admin'),
  @JsonValue(r'mobile')
  mobile(r'mobile'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PairingDeviceDtoAppEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
