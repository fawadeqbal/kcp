//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'login_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class LoginDto {
  /// Returns a new [LoginDto] instance.
  LoginDto({
    required this.email,

    required this.password,

    this.tokenDelivery,

    this.app,
  });

  @JsonKey(name: r'email', required: true, includeIfNull: false)
  final String email;

  @JsonKey(name: r'password', required: true, includeIfNull: false)
  final String password;

  /// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
  @JsonKey(
    name: r'tokenDelivery',
    required: false,
    includeIfNull: false,
    unknownEnumValue: LoginDtoTokenDeliveryEnum.unknownDefaultOpenApi,
  )
  final LoginDtoTokenDeliveryEnum? tokenDelivery;

  /// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
  @JsonKey(
    name: r'app',
    required: false,
    includeIfNull: false,
    unknownEnumValue: LoginDtoAppEnum.unknownDefaultOpenApi,
  )
  final LoginDtoAppEnum? app;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LoginDto &&
          other.email == email &&
          other.password == password &&
          other.tokenDelivery == tokenDelivery &&
          other.app == app;

  @override
  int get hashCode =>
      email.hashCode +
      password.hashCode +
      tokenDelivery.hashCode +
      app.hashCode;

  factory LoginDto.fromJson(Map<String, dynamic> json) =>
      _$LoginDtoFromJson(json);

  Map<String, dynamic> toJson() => _$LoginDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
enum LoginDtoTokenDeliveryEnum {
  @JsonValue(r'cookie')
  cookie(r'cookie'),
  @JsonValue(r'body')
  body(r'body'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LoginDtoTokenDeliveryEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
enum LoginDtoAppEnum {
  @JsonValue(r'web')
  web(r'web'),
  @JsonValue(r'admin')
  admin(r'admin'),
  @JsonValue(r'mobile')
  mobile(r'mobile'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const LoginDtoAppEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
