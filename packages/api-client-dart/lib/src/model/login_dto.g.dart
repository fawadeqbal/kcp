// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LoginDtoCWProxy {
  LoginDto email(String email);

  LoginDto password(String password);

  LoginDto tokenDelivery(LoginDtoTokenDeliveryEnum? tokenDelivery);

  LoginDto app(LoginDtoAppEnum? app);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LoginDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LoginDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LoginDto call({
    String email,
    String password,
    LoginDtoTokenDeliveryEnum? tokenDelivery,
    LoginDtoAppEnum? app,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLoginDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLoginDto.copyWith.fieldName(...)`
class _$LoginDtoCWProxyImpl implements _$LoginDtoCWProxy {
  const _$LoginDtoCWProxyImpl(this._value);

  final LoginDto _value;

  @override
  LoginDto email(String email) => this(email: email);

  @override
  LoginDto password(String password) => this(password: password);

  @override
  LoginDto tokenDelivery(LoginDtoTokenDeliveryEnum? tokenDelivery) =>
      this(tokenDelivery: tokenDelivery);

  @override
  LoginDto app(LoginDtoAppEnum? app) => this(app: app);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LoginDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LoginDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LoginDto call({
    Object? email = const $CopyWithPlaceholder(),
    Object? password = const $CopyWithPlaceholder(),
    Object? tokenDelivery = const $CopyWithPlaceholder(),
    Object? app = const $CopyWithPlaceholder(),
  }) {
    return LoginDto(
      email: email == const $CopyWithPlaceholder()
          ? _value.email
          // ignore: cast_nullable_to_non_nullable
          : email as String,
      password: password == const $CopyWithPlaceholder()
          ? _value.password
          // ignore: cast_nullable_to_non_nullable
          : password as String,
      tokenDelivery: tokenDelivery == const $CopyWithPlaceholder()
          ? _value.tokenDelivery
          // ignore: cast_nullable_to_non_nullable
          : tokenDelivery as LoginDtoTokenDeliveryEnum?,
      app: app == const $CopyWithPlaceholder()
          ? _value.app
          // ignore: cast_nullable_to_non_nullable
          : app as LoginDtoAppEnum?,
    );
  }
}

extension $LoginDtoCopyWith on LoginDto {
  /// Returns a callable class that can be used as follows: `instanceOfLoginDto.copyWith(...)` or like so:`instanceOfLoginDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LoginDtoCWProxy get copyWith => _$LoginDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginDto _$LoginDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LoginDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['email', 'password']);
      final val = LoginDto(
        email: $checkedConvert('email', (v) => v as String),
        password: $checkedConvert('password', (v) => v as String),
        tokenDelivery: $checkedConvert(
          'tokenDelivery',
          (v) => $enumDecodeNullable(
            _$LoginDtoTokenDeliveryEnumEnumMap,
            v,
            unknownValue: LoginDtoTokenDeliveryEnum.unknownDefaultOpenApi,
          ),
        ),
        app: $checkedConvert(
          'app',
          (v) => $enumDecodeNullable(
            _$LoginDtoAppEnumEnumMap,
            v,
            unknownValue: LoginDtoAppEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$LoginDtoToJson(LoginDto instance) => <String, dynamic>{
  'email': instance.email,
  'password': instance.password,
  'tokenDelivery': ?_$LoginDtoTokenDeliveryEnumEnumMap[instance.tokenDelivery],
  'app': ?_$LoginDtoAppEnumEnumMap[instance.app],
};

const _$LoginDtoTokenDeliveryEnumEnumMap = {
  LoginDtoTokenDeliveryEnum.cookie: 'cookie',
  LoginDtoTokenDeliveryEnum.body: 'body',
  LoginDtoTokenDeliveryEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$LoginDtoAppEnumEnumMap = {
  LoginDtoAppEnum.web: 'web',
  LoginDtoAppEnum.admin: 'admin',
  LoginDtoAppEnum.mobile: 'mobile',
  LoginDtoAppEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
