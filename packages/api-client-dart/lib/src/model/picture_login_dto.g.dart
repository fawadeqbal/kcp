// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'picture_login_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PictureLoginDtoCWProxy {
  PictureLoginDto username(String username);

  PictureLoginDto pictures(List<PictureLoginDtoPicturesEnum> pictures);

  PictureLoginDto tokenDelivery(
    PictureLoginDtoTokenDeliveryEnum? tokenDelivery,
  );

  PictureLoginDto app(PictureLoginDtoAppEnum? app);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PictureLoginDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PictureLoginDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PictureLoginDto call({
    String username,
    List<PictureLoginDtoPicturesEnum> pictures,
    PictureLoginDtoTokenDeliveryEnum? tokenDelivery,
    PictureLoginDtoAppEnum? app,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPictureLoginDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPictureLoginDto.copyWith.fieldName(...)`
class _$PictureLoginDtoCWProxyImpl implements _$PictureLoginDtoCWProxy {
  const _$PictureLoginDtoCWProxyImpl(this._value);

  final PictureLoginDto _value;

  @override
  PictureLoginDto username(String username) => this(username: username);

  @override
  PictureLoginDto pictures(List<PictureLoginDtoPicturesEnum> pictures) =>
      this(pictures: pictures);

  @override
  PictureLoginDto tokenDelivery(
    PictureLoginDtoTokenDeliveryEnum? tokenDelivery,
  ) => this(tokenDelivery: tokenDelivery);

  @override
  PictureLoginDto app(PictureLoginDtoAppEnum? app) => this(app: app);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PictureLoginDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PictureLoginDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PictureLoginDto call({
    Object? username = const $CopyWithPlaceholder(),
    Object? pictures = const $CopyWithPlaceholder(),
    Object? tokenDelivery = const $CopyWithPlaceholder(),
    Object? app = const $CopyWithPlaceholder(),
  }) {
    return PictureLoginDto(
      username: username == const $CopyWithPlaceholder()
          ? _value.username
          // ignore: cast_nullable_to_non_nullable
          : username as String,
      pictures: pictures == const $CopyWithPlaceholder()
          ? _value.pictures
          // ignore: cast_nullable_to_non_nullable
          : pictures as List<PictureLoginDtoPicturesEnum>,
      tokenDelivery: tokenDelivery == const $CopyWithPlaceholder()
          ? _value.tokenDelivery
          // ignore: cast_nullable_to_non_nullable
          : tokenDelivery as PictureLoginDtoTokenDeliveryEnum?,
      app: app == const $CopyWithPlaceholder()
          ? _value.app
          // ignore: cast_nullable_to_non_nullable
          : app as PictureLoginDtoAppEnum?,
    );
  }
}

extension $PictureLoginDtoCopyWith on PictureLoginDto {
  /// Returns a callable class that can be used as follows: `instanceOfPictureLoginDto.copyWith(...)` or like so:`instanceOfPictureLoginDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PictureLoginDtoCWProxy get copyWith => _$PictureLoginDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PictureLoginDto _$PictureLoginDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('PictureLoginDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['username', 'pictures']);
  final val = PictureLoginDto(
    username: $checkedConvert('username', (v) => v as String),
    pictures: $checkedConvert(
      'pictures',
      (v) => (v as List<dynamic>)
          .map(
            (e) => $enumDecode(
              _$PictureLoginDtoPicturesEnumEnumMap,
              e,
              unknownValue: PictureLoginDtoPicturesEnum.unknownDefaultOpenApi,
            ),
          )
          .toList(),
    ),
    tokenDelivery: $checkedConvert(
      'tokenDelivery',
      (v) => $enumDecodeNullable(
        _$PictureLoginDtoTokenDeliveryEnumEnumMap,
        v,
        unknownValue: PictureLoginDtoTokenDeliveryEnum.unknownDefaultOpenApi,
      ),
    ),
    app: $checkedConvert(
      'app',
      (v) => $enumDecodeNullable(
        _$PictureLoginDtoAppEnumEnumMap,
        v,
        unknownValue: PictureLoginDtoAppEnum.unknownDefaultOpenApi,
      ),
    ),
  );
  return val;
});

Map<String, dynamic> _$PictureLoginDtoToJson(PictureLoginDto instance) =>
    <String, dynamic>{
      'username': instance.username,
      'pictures': instance.pictures
          .map((e) => _$PictureLoginDtoPicturesEnumEnumMap[e]!)
          .toList(),
      'tokenDelivery':
          ?_$PictureLoginDtoTokenDeliveryEnumEnumMap[instance.tokenDelivery],
      'app': ?_$PictureLoginDtoAppEnumEnumMap[instance.app],
    };

const _$PictureLoginDtoPicturesEnumEnumMap = {
  PictureLoginDtoPicturesEnum.cat: 'cat',
  PictureLoginDtoPicturesEnum.dog: 'dog',
  PictureLoginDtoPicturesEnum.fish: 'fish',
  PictureLoginDtoPicturesEnum.bird: 'bird',
  PictureLoginDtoPicturesEnum.rabbit: 'rabbit',
  PictureLoginDtoPicturesEnum.sun: 'sun',
  PictureLoginDtoPicturesEnum.moon: 'moon',
  PictureLoginDtoPicturesEnum.star: 'star',
  PictureLoginDtoPicturesEnum.tree: 'tree',
  PictureLoginDtoPicturesEnum.flower: 'flower',
  PictureLoginDtoPicturesEnum.apple: 'apple',
  PictureLoginDtoPicturesEnum.car: 'car',
  PictureLoginDtoPicturesEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$PictureLoginDtoTokenDeliveryEnumEnumMap = {
  PictureLoginDtoTokenDeliveryEnum.cookie: 'cookie',
  PictureLoginDtoTokenDeliveryEnum.body: 'body',
  PictureLoginDtoTokenDeliveryEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};

const _$PictureLoginDtoAppEnumEnumMap = {
  PictureLoginDtoAppEnum.web: 'web',
  PictureLoginDtoAppEnum.admin: 'admin',
  PictureLoginDtoAppEnum.mobile: 'mobile',
  PictureLoginDtoAppEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
