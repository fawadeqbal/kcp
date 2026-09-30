//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'refresh_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class RefreshDto {
  /// Returns a new [RefreshDto] instance.
  RefreshDto({this.refreshToken, this.tokenDelivery, this.app});

  /// Only for tokenDelivery \"body\" clients; browsers send the cookie instead.
  @JsonKey(name: r'refreshToken', required: false, includeIfNull: false)
  final String? refreshToken;

  /// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
  @JsonKey(
    name: r'tokenDelivery',
    required: false,
    includeIfNull: false,
    unknownEnumValue: RefreshDtoTokenDeliveryEnum.unknownDefaultOpenApi,
  )
  final RefreshDtoTokenDeliveryEnum? tokenDelivery;

  /// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
  @JsonKey(
    name: r'app',
    required: false,
    includeIfNull: false,
    unknownEnumValue: RefreshDtoAppEnum.unknownDefaultOpenApi,
  )
  final RefreshDtoAppEnum? app;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RefreshDto &&
          other.refreshToken == refreshToken &&
          other.tokenDelivery == tokenDelivery &&
          other.app == app;

  @override
  int get hashCode =>
      refreshToken.hashCode + tokenDelivery.hashCode + app.hashCode;

  factory RefreshDto.fromJson(Map<String, dynamic> json) =>
      _$RefreshDtoFromJson(json);

  Map<String, dynamic> toJson() => _$RefreshDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
enum RefreshDtoTokenDeliveryEnum {
  @JsonValue(r'cookie')
  cookie(r'cookie'),
  @JsonValue(r'body')
  body(r'body'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const RefreshDtoTokenDeliveryEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
enum RefreshDtoAppEnum {
  @JsonValue(r'web')
  web(r'web'),
  @JsonValue(r'admin')
  admin(r'admin'),
  @JsonValue(r'mobile')
  mobile(r'mobile'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const RefreshDtoAppEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
