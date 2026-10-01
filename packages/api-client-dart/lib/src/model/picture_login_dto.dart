//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'picture_login_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class PictureLoginDto {
  /// Returns a new [PictureLoginDto] instance.
  PictureLoginDto({
    required this.username,

    required this.pictures,

    this.tokenDelivery,

    this.app,
  });

  @JsonKey(name: r'username', required: true, includeIfNull: false)
  final String username;

  /// Four picture keys in the order the child tapped them.
  @JsonKey(
    name: r'pictures',
    required: true,
    includeIfNull: false,
    unknownEnumValue: PictureLoginDtoPicturesEnum.unknownDefaultOpenApi,
  )
  final List<PictureLoginDtoPicturesEnum> pictures;

  /// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
  @JsonKey(
    name: r'tokenDelivery',
    required: false,
    includeIfNull: false,
    unknownEnumValue: PictureLoginDtoTokenDeliveryEnum.unknownDefaultOpenApi,
  )
  final PictureLoginDtoTokenDeliveryEnum? tokenDelivery;

  /// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
  @JsonKey(
    name: r'app',
    required: false,
    includeIfNull: false,
    unknownEnumValue: PictureLoginDtoAppEnum.unknownDefaultOpenApi,
  )
  final PictureLoginDtoAppEnum? app;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is PictureLoginDto &&
          other.username == username &&
          other.pictures == pictures &&
          other.tokenDelivery == tokenDelivery &&
          other.app == app;

  @override
  int get hashCode =>
      username.hashCode +
      pictures.hashCode +
      tokenDelivery.hashCode +
      app.hashCode;

  factory PictureLoginDto.fromJson(Map<String, dynamic> json) =>
      _$PictureLoginDtoFromJson(json);

  Map<String, dynamic> toJson() => _$PictureLoginDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum PictureLoginDtoPicturesEnum {
  @JsonValue(r'cat')
  cat(r'cat'),
  @JsonValue(r'dog')
  dog(r'dog'),
  @JsonValue(r'fish')
  fish(r'fish'),
  @JsonValue(r'bird')
  bird(r'bird'),
  @JsonValue(r'rabbit')
  rabbit(r'rabbit'),
  @JsonValue(r'sun')
  sun(r'sun'),
  @JsonValue(r'moon')
  moon(r'moon'),
  @JsonValue(r'star')
  star(r'star'),
  @JsonValue(r'tree')
  tree(r'tree'),
  @JsonValue(r'flower')
  flower(r'flower'),
  @JsonValue(r'apple')
  apple(r'apple'),
  @JsonValue(r'car')
  car(r'car'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PictureLoginDtoPicturesEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// How to hand over the refresh token. Browsers use \"cookie\" (the default): an httpOnly cookie scripts can't read. The mobile app uses \"body\" and keeps it in secure storage.
enum PictureLoginDtoTokenDeliveryEnum {
  @JsonValue(r'cookie')
  cookie(r'cookie'),
  @JsonValue(r'body')
  body(r'body'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PictureLoginDtoTokenDeliveryEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// Which app is signing in. The admin panel keeps its own refresh cookie, so a staff session and a parent session in the same browser never overwrite each other, and only staff can sign in to it. The mobile app is for students and parents only, and always gets its refresh token in the body.
enum PictureLoginDtoAppEnum {
  @JsonValue(r'web')
  web(r'web'),
  @JsonValue(r'admin')
  admin(r'admin'),
  @JsonValue(r'mobile')
  mobile(r'mobile'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const PictureLoginDtoAppEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
