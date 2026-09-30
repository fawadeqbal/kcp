// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_response_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LoginResponseDtoCWProxy {
  LoginResponseDto status(LoginResponseDtoStatusEnum status);

  LoginResponseDto accessToken(String? accessToken);

  LoginResponseDto expiresIn(num? expiresIn);

  LoginResponseDto refreshToken(String? refreshToken);

  LoginResponseDto mfaToken(String? mfaToken);

  LoginResponseDto user(MeDto? user);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LoginResponseDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LoginResponseDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LoginResponseDto call({
    LoginResponseDtoStatusEnum status,
    String? accessToken,
    num? expiresIn,
    String? refreshToken,
    String? mfaToken,
    MeDto? user,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLoginResponseDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLoginResponseDto.copyWith.fieldName(...)`
class _$LoginResponseDtoCWProxyImpl implements _$LoginResponseDtoCWProxy {
  const _$LoginResponseDtoCWProxyImpl(this._value);

  final LoginResponseDto _value;

  @override
  LoginResponseDto status(LoginResponseDtoStatusEnum status) =>
      this(status: status);

  @override
  LoginResponseDto accessToken(String? accessToken) =>
      this(accessToken: accessToken);

  @override
  LoginResponseDto expiresIn(num? expiresIn) => this(expiresIn: expiresIn);

  @override
  LoginResponseDto refreshToken(String? refreshToken) =>
      this(refreshToken: refreshToken);

  @override
  LoginResponseDto mfaToken(String? mfaToken) => this(mfaToken: mfaToken);

  @override
  LoginResponseDto user(MeDto? user) => this(user: user);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LoginResponseDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LoginResponseDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LoginResponseDto call({
    Object? status = const $CopyWithPlaceholder(),
    Object? accessToken = const $CopyWithPlaceholder(),
    Object? expiresIn = const $CopyWithPlaceholder(),
    Object? refreshToken = const $CopyWithPlaceholder(),
    Object? mfaToken = const $CopyWithPlaceholder(),
    Object? user = const $CopyWithPlaceholder(),
  }) {
    return LoginResponseDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as LoginResponseDtoStatusEnum,
      accessToken: accessToken == const $CopyWithPlaceholder()
          ? _value.accessToken
          // ignore: cast_nullable_to_non_nullable
          : accessToken as String?,
      expiresIn: expiresIn == const $CopyWithPlaceholder()
          ? _value.expiresIn
          // ignore: cast_nullable_to_non_nullable
          : expiresIn as num?,
      refreshToken: refreshToken == const $CopyWithPlaceholder()
          ? _value.refreshToken
          // ignore: cast_nullable_to_non_nullable
          : refreshToken as String?,
      mfaToken: mfaToken == const $CopyWithPlaceholder()
          ? _value.mfaToken
          // ignore: cast_nullable_to_non_nullable
          : mfaToken as String?,
      user: user == const $CopyWithPlaceholder()
          ? _value.user
          // ignore: cast_nullable_to_non_nullable
          : user as MeDto?,
    );
  }
}

extension $LoginResponseDtoCopyWith on LoginResponseDto {
  /// Returns a callable class that can be used as follows: `instanceOfLoginResponseDto.copyWith(...)` or like so:`instanceOfLoginResponseDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LoginResponseDtoCWProxy get copyWith => _$LoginResponseDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginResponseDto _$LoginResponseDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LoginResponseDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['status']);
      final val = LoginResponseDto(
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$LoginResponseDtoStatusEnumEnumMap,
            v,
            unknownValue: LoginResponseDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
        accessToken: $checkedConvert('accessToken', (v) => v as String?),
        expiresIn: $checkedConvert('expiresIn', (v) => v as num?),
        refreshToken: $checkedConvert('refreshToken', (v) => v as String?),
        mfaToken: $checkedConvert('mfaToken', (v) => v as String?),
        user: $checkedConvert(
          'user',
          (v) => v == null ? null : MeDto.fromJson(v as Map<String, dynamic>),
        ),
      );
      return val;
    });

Map<String, dynamic> _$LoginResponseDtoToJson(LoginResponseDto instance) =>
    <String, dynamic>{
      'status': _$LoginResponseDtoStatusEnumEnumMap[instance.status]!,
      'accessToken': ?instance.accessToken,
      'expiresIn': ?instance.expiresIn,
      'refreshToken': ?instance.refreshToken,
      'mfaToken': ?instance.mfaToken,
      'user': ?instance.user?.toJson(),
    };

const _$LoginResponseDtoStatusEnumEnumMap = {
  LoginResponseDtoStatusEnum.authenticated: 'authenticated',
  LoginResponseDtoStatusEnum.mfaRequired: 'mfa_required',
  LoginResponseDtoStatusEnum.mfaSetupRequired: 'mfa_setup_required',
  LoginResponseDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
