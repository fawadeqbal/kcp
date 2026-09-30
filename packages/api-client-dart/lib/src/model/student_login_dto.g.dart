// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'student_login_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$StudentLoginDtoCWProxy {
  StudentLoginDto username(String username);

  StudentLoginDto password(String password);

  StudentLoginDto tokenDelivery(
    StudentLoginDtoTokenDeliveryEnum? tokenDelivery,
  );

  StudentLoginDto app(StudentLoginDtoAppEnum? app);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StudentLoginDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StudentLoginDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StudentLoginDto call({
    String username,
    String password,
    StudentLoginDtoTokenDeliveryEnum? tokenDelivery,
    StudentLoginDtoAppEnum? app,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfStudentLoginDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfStudentLoginDto.copyWith.fieldName(...)`
class _$StudentLoginDtoCWProxyImpl implements _$StudentLoginDtoCWProxy {
  const _$StudentLoginDtoCWProxyImpl(this._value);

  final StudentLoginDto _value;

  @override
  StudentLoginDto username(String username) => this(username: username);

  @override
  StudentLoginDto password(String password) => this(password: password);

  @override
  StudentLoginDto tokenDelivery(
    StudentLoginDtoTokenDeliveryEnum? tokenDelivery,
  ) => this(tokenDelivery: tokenDelivery);

  @override
  StudentLoginDto app(StudentLoginDtoAppEnum? app) => this(app: app);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StudentLoginDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StudentLoginDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StudentLoginDto call({
    Object? username = const $CopyWithPlaceholder(),
    Object? password = const $CopyWithPlaceholder(),
    Object? tokenDelivery = const $CopyWithPlaceholder(),
    Object? app = const $CopyWithPlaceholder(),
  }) {
    return StudentLoginDto(
      username: username == const $CopyWithPlaceholder()
          ? _value.username
          // ignore: cast_nullable_to_non_nullable
          : username as String,
      password: password == const $CopyWithPlaceholder()
          ? _value.password
          // ignore: cast_nullable_to_non_nullable
          : password as String,
      tokenDelivery: tokenDelivery == const $CopyWithPlaceholder()
          ? _value.tokenDelivery
          // ignore: cast_nullable_to_non_nullable
          : tokenDelivery as StudentLoginDtoTokenDeliveryEnum?,
      app: app == const $CopyWithPlaceholder()
          ? _value.app
          // ignore: cast_nullable_to_non_nullable
          : app as StudentLoginDtoAppEnum?,
    );
  }
}

extension $StudentLoginDtoCopyWith on StudentLoginDto {
  /// Returns a callable class that can be used as follows: `instanceOfStudentLoginDto.copyWith(...)` or like so:`instanceOfStudentLoginDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$StudentLoginDtoCWProxy get copyWith => _$StudentLoginDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

StudentLoginDto _$StudentLoginDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('StudentLoginDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['username', 'password']);
      final val = StudentLoginDto(
        username: $checkedConvert('username', (v) => v as String),
        password: $checkedConvert('password', (v) => v as String),
        tokenDelivery: $checkedConvert(
          'tokenDelivery',
          (v) => $enumDecodeNullable(
            _$StudentLoginDtoTokenDeliveryEnumEnumMap,
            v,
            unknownValue:
                StudentLoginDtoTokenDeliveryEnum.unknownDefaultOpenApi,
          ),
        ),
        app: $checkedConvert(
          'app',
          (v) => $enumDecodeNullable(
            _$StudentLoginDtoAppEnumEnumMap,
            v,
            unknownValue: StudentLoginDtoAppEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$StudentLoginDtoToJson(StudentLoginDto instance) =>
    <String, dynamic>{
      'username': instance.username,
      'password': instance.password,
      'tokenDelivery':
          ?_$StudentLoginDtoTokenDeliveryEnumEnumMap[instance.tokenDelivery],
      'app': ?_$StudentLoginDtoAppEnumEnumMap[instance.app],
    };

const _$StudentLoginDtoTokenDeliveryEnumEnumMap = {
  StudentLoginDtoTokenDeliveryEnum.cookie: 'cookie',
  StudentLoginDtoTokenDeliveryEnum.body: 'body',
  StudentLoginDtoTokenDeliveryEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};

const _$StudentLoginDtoAppEnumEnumMap = {
  StudentLoginDtoAppEnum.web: 'web',
  StudentLoginDtoAppEnum.admin: 'admin',
  StudentLoginDtoAppEnum.mobile: 'mobile',
  StudentLoginDtoAppEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
