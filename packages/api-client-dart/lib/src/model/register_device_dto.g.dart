// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'register_device_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$RegisterDeviceDtoCWProxy {
  RegisterDeviceDto token(String token);

  RegisterDeviceDto platform(RegisterDeviceDtoPlatformEnum platform);

  RegisterDeviceDto language(RegisterDeviceDtoLanguageEnum language);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `RegisterDeviceDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// RegisterDeviceDto(...).copyWith(id: 12, name: "My name")
  /// ````
  RegisterDeviceDto call({
    String token,
    RegisterDeviceDtoPlatformEnum platform,
    RegisterDeviceDtoLanguageEnum language,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfRegisterDeviceDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfRegisterDeviceDto.copyWith.fieldName(...)`
class _$RegisterDeviceDtoCWProxyImpl implements _$RegisterDeviceDtoCWProxy {
  const _$RegisterDeviceDtoCWProxyImpl(this._value);

  final RegisterDeviceDto _value;

  @override
  RegisterDeviceDto token(String token) => this(token: token);

  @override
  RegisterDeviceDto platform(RegisterDeviceDtoPlatformEnum platform) =>
      this(platform: platform);

  @override
  RegisterDeviceDto language(RegisterDeviceDtoLanguageEnum language) =>
      this(language: language);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `RegisterDeviceDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// RegisterDeviceDto(...).copyWith(id: 12, name: "My name")
  /// ````
  RegisterDeviceDto call({
    Object? token = const $CopyWithPlaceholder(),
    Object? platform = const $CopyWithPlaceholder(),
    Object? language = const $CopyWithPlaceholder(),
  }) {
    return RegisterDeviceDto(
      token: token == const $CopyWithPlaceholder()
          ? _value.token
          // ignore: cast_nullable_to_non_nullable
          : token as String,
      platform: platform == const $CopyWithPlaceholder()
          ? _value.platform
          // ignore: cast_nullable_to_non_nullable
          : platform as RegisterDeviceDtoPlatformEnum,
      language: language == const $CopyWithPlaceholder()
          ? _value.language
          // ignore: cast_nullable_to_non_nullable
          : language as RegisterDeviceDtoLanguageEnum,
    );
  }
}

extension $RegisterDeviceDtoCopyWith on RegisterDeviceDto {
  /// Returns a callable class that can be used as follows: `instanceOfRegisterDeviceDto.copyWith(...)` or like so:`instanceOfRegisterDeviceDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$RegisterDeviceDtoCWProxy get copyWith =>
      _$RegisterDeviceDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RegisterDeviceDto _$RegisterDeviceDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('RegisterDeviceDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['token', 'platform', 'language']);
      final val = RegisterDeviceDto(
        token: $checkedConvert('token', (v) => v as String),
        platform: $checkedConvert(
          'platform',
          (v) => $enumDecode(
            _$RegisterDeviceDtoPlatformEnumEnumMap,
            v,
            unknownValue: RegisterDeviceDtoPlatformEnum.unknownDefaultOpenApi,
          ),
        ),
        language: $checkedConvert(
          'language',
          (v) => $enumDecode(
            _$RegisterDeviceDtoLanguageEnumEnumMap,
            v,
            unknownValue: RegisterDeviceDtoLanguageEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$RegisterDeviceDtoToJson(RegisterDeviceDto instance) =>
    <String, dynamic>{
      'token': instance.token,
      'platform': _$RegisterDeviceDtoPlatformEnumEnumMap[instance.platform]!,
      'language': _$RegisterDeviceDtoLanguageEnumEnumMap[instance.language]!,
    };

const _$RegisterDeviceDtoPlatformEnumEnumMap = {
  RegisterDeviceDtoPlatformEnum.android: 'android',
  RegisterDeviceDtoPlatformEnum.ios: 'ios',
  RegisterDeviceDtoPlatformEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};

const _$RegisterDeviceDtoLanguageEnumEnumMap = {
  RegisterDeviceDtoLanguageEnum.en: 'en',
  RegisterDeviceDtoLanguageEnum.ar: 'ar',
  RegisterDeviceDtoLanguageEnum.ur: 'ur',
  RegisterDeviceDtoLanguageEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
