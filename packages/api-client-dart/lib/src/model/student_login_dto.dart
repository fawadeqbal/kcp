//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'student_login_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class StudentLoginDto {
  /// Returns a new [StudentLoginDto] instance.
  StudentLoginDto({
    required this.username,

    required this.password,

    this.tokenDelivery,

    this.app,
  });

  /// The login name the parent received, e.g. \"swift-falcon-4821\".
  @JsonKey(name: r'username', required: true, includeIfNull: false)
  final String username;

  @JsonKey(name: r'password', required: true, includeIfNull: false)
  final String password;

  /// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
  @JsonKey(
    name: r'tokenDelivery',
    required: false,
    includeIfNull: false,
    unknownEnumValue: StudentLoginDtoTokenDeliveryEnum.unknownDefaultOpenApi,
  )
  final StudentLoginDtoTokenDeliveryEnum? tokenDelivery;

  /// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
  @JsonKey(
    name: r'app',
    required: false,
    includeIfNull: false,
    unknownEnumValue: StudentLoginDtoAppEnum.unknownDefaultOpenApi,
  )
  final StudentLoginDtoAppEnum? app;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is StudentLoginDto &&
          other.username == username &&
          other.password == password &&
          other.tokenDelivery == tokenDelivery &&
          other.app == app;

  @override
  int get hashCode =>
      username.hashCode +
      password.hashCode +
      tokenDelivery.hashCode +
      app.hashCode;

  factory StudentLoginDto.fromJson(Map<String, dynamic> json) =>
      _$StudentLoginDtoFromJson(json);

  Map<String, dynamic> toJson() => _$StudentLoginDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

/// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
enum StudentLoginDtoTokenDeliveryEnum {
  @JsonValue(r'cookie')
  cookie(r'cookie'),
  @JsonValue(r'body')
  body(r'body'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const StudentLoginDtoTokenDeliveryEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
enum StudentLoginDtoAppEnum {
  @JsonValue(r'web')
  web(r'web'),
  @JsonValue(r'admin')
  admin(r'admin'),
  @JsonValue(r'mobile')
  mobile(r'mobile'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const StudentLoginDtoAppEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
