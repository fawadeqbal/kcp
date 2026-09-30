// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'report_crash_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ReportCrashDtoCWProxy {
  ReportCrashDto appVersion(String appVersion);

  ReportCrashDto platform(ReportCrashDtoPlatformEnum platform);

  ReportCrashDto osVersion(String osVersion);

  ReportCrashDto fatal(bool fatal);

  ReportCrashDto message(String message);

  ReportCrashDto stack(String stack);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ReportCrashDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ReportCrashDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ReportCrashDto call({
    String appVersion,
    ReportCrashDtoPlatformEnum platform,
    String osVersion,
    bool fatal,
    String message,
    String stack,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfReportCrashDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfReportCrashDto.copyWith.fieldName(...)`
class _$ReportCrashDtoCWProxyImpl implements _$ReportCrashDtoCWProxy {
  const _$ReportCrashDtoCWProxyImpl(this._value);

  final ReportCrashDto _value;

  @override
  ReportCrashDto appVersion(String appVersion) => this(appVersion: appVersion);

  @override
  ReportCrashDto platform(ReportCrashDtoPlatformEnum platform) =>
      this(platform: platform);

  @override
  ReportCrashDto osVersion(String osVersion) => this(osVersion: osVersion);

  @override
  ReportCrashDto fatal(bool fatal) => this(fatal: fatal);

  @override
  ReportCrashDto message(String message) => this(message: message);

  @override
  ReportCrashDto stack(String stack) => this(stack: stack);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ReportCrashDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ReportCrashDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ReportCrashDto call({
    Object? appVersion = const $CopyWithPlaceholder(),
    Object? platform = const $CopyWithPlaceholder(),
    Object? osVersion = const $CopyWithPlaceholder(),
    Object? fatal = const $CopyWithPlaceholder(),
    Object? message = const $CopyWithPlaceholder(),
    Object? stack = const $CopyWithPlaceholder(),
  }) {
    return ReportCrashDto(
      appVersion: appVersion == const $CopyWithPlaceholder()
          ? _value.appVersion
          // ignore: cast_nullable_to_non_nullable
          : appVersion as String,
      platform: platform == const $CopyWithPlaceholder()
          ? _value.platform
          // ignore: cast_nullable_to_non_nullable
          : platform as ReportCrashDtoPlatformEnum,
      osVersion: osVersion == const $CopyWithPlaceholder()
          ? _value.osVersion
          // ignore: cast_nullable_to_non_nullable
          : osVersion as String,
      fatal: fatal == const $CopyWithPlaceholder()
          ? _value.fatal
          // ignore: cast_nullable_to_non_nullable
          : fatal as bool,
      message: message == const $CopyWithPlaceholder()
          ? _value.message
          // ignore: cast_nullable_to_non_nullable
          : message as String,
      stack: stack == const $CopyWithPlaceholder()
          ? _value.stack
          // ignore: cast_nullable_to_non_nullable
          : stack as String,
    );
  }
}

extension $ReportCrashDtoCopyWith on ReportCrashDto {
  /// Returns a callable class that can be used as follows: `instanceOfReportCrashDto.copyWith(...)` or like so:`instanceOfReportCrashDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ReportCrashDtoCWProxy get copyWith => _$ReportCrashDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ReportCrashDto _$ReportCrashDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ReportCrashDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'appVersion',
          'platform',
          'osVersion',
          'fatal',
          'message',
          'stack',
        ],
      );
      final val = ReportCrashDto(
        appVersion: $checkedConvert('appVersion', (v) => v as String),
        platform: $checkedConvert(
          'platform',
          (v) => $enumDecode(
            _$ReportCrashDtoPlatformEnumEnumMap,
            v,
            unknownValue: ReportCrashDtoPlatformEnum.unknownDefaultOpenApi,
          ),
        ),
        osVersion: $checkedConvert('osVersion', (v) => v as String),
        fatal: $checkedConvert('fatal', (v) => v as bool),
        message: $checkedConvert('message', (v) => v as String),
        stack: $checkedConvert('stack', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$ReportCrashDtoToJson(ReportCrashDto instance) =>
    <String, dynamic>{
      'appVersion': instance.appVersion,
      'platform': _$ReportCrashDtoPlatformEnumEnumMap[instance.platform]!,
      'osVersion': instance.osVersion,
      'fatal': instance.fatal,
      'message': instance.message,
      'stack': instance.stack,
    };

const _$ReportCrashDtoPlatformEnumEnumMap = {
  ReportCrashDtoPlatformEnum.android: 'android',
  ReportCrashDtoPlatformEnum.ios: 'ios',
  ReportCrashDtoPlatformEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
