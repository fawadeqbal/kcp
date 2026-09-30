// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'refresh_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$RefreshDtoCWProxy {
  RefreshDto refreshToken(String? refreshToken);

  RefreshDto tokenDelivery(RefreshDtoTokenDeliveryEnum? tokenDelivery);

  RefreshDto app(RefreshDtoAppEnum? app);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `RefreshDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// RefreshDto(...).copyWith(id: 12, name: "My name")
  /// ````
  RefreshDto call({
    String? refreshToken,
    RefreshDtoTokenDeliveryEnum? tokenDelivery,
    RefreshDtoAppEnum? app,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfRefreshDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfRefreshDto.copyWith.fieldName(...)`
class _$RefreshDtoCWProxyImpl implements _$RefreshDtoCWProxy {
  const _$RefreshDtoCWProxyImpl(this._value);

  final RefreshDto _value;

  @override
  RefreshDto refreshToken(String? refreshToken) =>
      this(refreshToken: refreshToken);

  @override
  RefreshDto tokenDelivery(RefreshDtoTokenDeliveryEnum? tokenDelivery) =>
      this(tokenDelivery: tokenDelivery);

  @override
  RefreshDto app(RefreshDtoAppEnum? app) => this(app: app);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `RefreshDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// RefreshDto(...).copyWith(id: 12, name: "My name")
  /// ````
  RefreshDto call({
    Object? refreshToken = const $CopyWithPlaceholder(),
    Object? tokenDelivery = const $CopyWithPlaceholder(),
    Object? app = const $CopyWithPlaceholder(),
  }) {
    return RefreshDto(
      refreshToken: refreshToken == const $CopyWithPlaceholder()
          ? _value.refreshToken
          // ignore: cast_nullable_to_non_nullable
          : refreshToken as String?,
      tokenDelivery: tokenDelivery == const $CopyWithPlaceholder()
          ? _value.tokenDelivery
          // ignore: cast_nullable_to_non_nullable
          : tokenDelivery as RefreshDtoTokenDeliveryEnum?,
      app: app == const $CopyWithPlaceholder()
          ? _value.app
          // ignore: cast_nullable_to_non_nullable
          : app as RefreshDtoAppEnum?,
    );
  }
}

extension $RefreshDtoCopyWith on RefreshDto {
  /// Returns a callable class that can be used as follows: `instanceOfRefreshDto.copyWith(...)` or like so:`instanceOfRefreshDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$RefreshDtoCWProxy get copyWith => _$RefreshDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RefreshDto _$RefreshDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('RefreshDto', json, ($checkedConvert) {
      final val = RefreshDto(
        refreshToken: $checkedConvert('refreshToken', (v) => v as String?),
        tokenDelivery: $checkedConvert(
          'tokenDelivery',
          (v) => $enumDecodeNullable(
            _$RefreshDtoTokenDeliveryEnumEnumMap,
            v,
            unknownValue: RefreshDtoTokenDeliveryEnum.unknownDefaultOpenApi,
          ),
        ),
        app: $checkedConvert(
          'app',
          (v) => $enumDecodeNullable(
            _$RefreshDtoAppEnumEnumMap,
            v,
            unknownValue: RefreshDtoAppEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$RefreshDtoToJson(RefreshDto instance) =>
    <String, dynamic>{
      'refreshToken': ?instance.refreshToken,
      'tokenDelivery':
          ?_$RefreshDtoTokenDeliveryEnumEnumMap[instance.tokenDelivery],
      'app': ?_$RefreshDtoAppEnumEnumMap[instance.app],
    };

const _$RefreshDtoTokenDeliveryEnumEnumMap = {
  RefreshDtoTokenDeliveryEnum.cookie: 'cookie',
  RefreshDtoTokenDeliveryEnum.body: 'body',
  RefreshDtoTokenDeliveryEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$RefreshDtoAppEnumEnumMap = {
  RefreshDtoAppEnum.web: 'web',
  RefreshDtoAppEnum.admin: 'admin',
  RefreshDtoAppEnum.mobile: 'mobile',
  RefreshDtoAppEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
