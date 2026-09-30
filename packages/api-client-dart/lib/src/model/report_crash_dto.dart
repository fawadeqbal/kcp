//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'report_crash_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class ReportCrashDto {
  /// Returns a new [ReportCrashDto] instance.
  ReportCrashDto({
    required this.appVersion,

    required this.platform,

    required this.osVersion,

    required this.fatal,

    required this.message,

    required this.stack,
  });

  /// e.g. \"1.0.0+12\".
  @JsonKey(name: r'appVersion', required: true, includeIfNull: false)
  final String appVersion;

  @JsonKey(
    name: r'platform',
    required: true,
    includeIfNull: false,
    unknownEnumValue: ReportCrashDtoPlatformEnum.unknownDefaultOpenApi,
  )
  final ReportCrashDtoPlatformEnum platform;

  /// e.g. \"Android 15 (API 35)\".
  @JsonKey(name: r'osVersion', required: true, includeIfNull: false)
  final String osVersion;

  /// The app had to stop (not just an error it recovered from).
  @JsonKey(name: r'fatal', required: true, includeIfNull: false)
  final bool fatal;

  @JsonKey(name: r'message', required: true, includeIfNull: false)
  final String message;

  /// The stack trace; longer ones are cut.
  @JsonKey(name: r'stack', required: true, includeIfNull: false)
  final String stack;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ReportCrashDto &&
          other.appVersion == appVersion &&
          other.platform == platform &&
          other.osVersion == osVersion &&
          other.fatal == fatal &&
          other.message == message &&
          other.stack == stack;

  @override
  int get hashCode =>
      appVersion.hashCode +
      platform.hashCode +
      osVersion.hashCode +
      fatal.hashCode +
      message.hashCode +
      stack.hashCode;

  factory ReportCrashDto.fromJson(Map<String, dynamic> json) =>
      _$ReportCrashDtoFromJson(json);

  Map<String, dynamic> toJson() => _$ReportCrashDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}

enum ReportCrashDtoPlatformEnum {
  @JsonValue(r'android')
  android(r'android'),
  @JsonValue(r'ios')
  ios(r'ios'),
  @JsonValue(r'unknown_default_open_api')
  unknownDefaultOpenApi(r'unknown_default_open_api');

  const ReportCrashDtoPlatformEnum(this.value);

  final String value;

  @override
  String toString() => value;
}
