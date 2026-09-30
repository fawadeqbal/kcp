//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'register_device_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class RegisterDeviceDto {
  /// Returns a new [RegisterDeviceDto] instance.
  RegisterDeviceDto({
    required this.token,

    required this.platform,

    required this.language,
  });

  /// The phone's Firebase Cloud Messaging token.
  @JsonKey(name: r'token', required: true, includeIfNull: false)
  final String token;

  @JsonKey(
    name: r'platform',
    required: true,
    includeIfNull: false,
    unknownEnumValue: RegisterDeviceDtoPlatformEnum.unknownDefaultOpenApi,
  )
  final RegisterDeviceDtoPlatformEnum platform;

  /// The app's language (en, ar or ur): notifications are written in it.
  @JsonKey(
    name: r'language',
    required: true,
    includeIfNull: false,
    unknownEnumValue: RegisterDeviceDtoLanguageEnum.unknownDefaultOpenApi,
  )
  final RegisterDeviceDtoLanguageEnum language;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RegisterDeviceDto &&
          other.token == token &&
          other.platform == platform &&
          other.language == language;

  @override
  int get hashCode => token.hashCode + platform.hashCode + language.hashCode;

  factory RegisterDeviceDto.fromJson(Map<String, dynamic> json) =>
      _$RegisterDeviceDtoFromJson(json);

  Map<String, dynamic> toJson() => _$RegisterDeviceDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum RegisterDeviceDtoPlatformEnum {
  @JsonValue(r'android')
  android(r'android'),
  @JsonValue(r'ios')
  ios(r'ios'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const RegisterDeviceDtoPlatformEnum(this.value);

  final String value;

  @override
  String toString() => value;
}

/// The app's language (en, ar or ur): notifications are written in it.
enum RegisterDeviceDtoLanguageEnum {
  @JsonValue(r'en')
  en(r'en'),
  @JsonValue(r'ar')
  ar(r'ar'),
  @JsonValue(r'ur')
  ur(r'ur'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const RegisterDeviceDtoLanguageEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
