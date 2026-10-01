// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'picture_password_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PicturePasswordDtoCWProxy {
  PicturePasswordDto pictures(List<PicturePasswordDtoPicturesEnum>? pictures);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PicturePasswordDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PicturePasswordDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PicturePasswordDto call({List<PicturePasswordDtoPicturesEnum>? pictures});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPicturePasswordDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPicturePasswordDto.copyWith.fieldName(...)`
class _$PicturePasswordDtoCWProxyImpl implements _$PicturePasswordDtoCWProxy {
  const _$PicturePasswordDtoCWProxyImpl(this._value);

  final PicturePasswordDto _value;

  @override
  PicturePasswordDto pictures(List<PicturePasswordDtoPicturesEnum>? pictures) =>
      this(pictures: pictures);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PicturePasswordDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PicturePasswordDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PicturePasswordDto call({Object? pictures = const $CopyWithPlaceholder()}) {
    return PicturePasswordDto(
      pictures: pictures == const $CopyWithPlaceholder()
          ? _value.pictures
          // ignore: cast_nullable_to_non_nullable
          : pictures as List<PicturePasswordDtoPicturesEnum>?,
    );
  }
}

extension $PicturePasswordDtoCopyWith on PicturePasswordDto {
  /// Returns a callable class that can be used as follows: `instanceOfPicturePasswordDto.copyWith(...)` or like so:`instanceOfPicturePasswordDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PicturePasswordDtoCWProxy get copyWith =>
      _$PicturePasswordDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PicturePasswordDto _$PicturePasswordDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PicturePasswordDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['pictures']);
      final val = PicturePasswordDto(
        pictures: $checkedConvert(
          'pictures',
          (v) => (v as List<dynamic>?)
              ?.map(
                (e) => $enumDecode(
                  _$PicturePasswordDtoPicturesEnumEnumMap,
                  e,
                  unknownValue:
                      PicturePasswordDtoPicturesEnum.unknownDefaultOpenApi,
                ),
              )
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$PicturePasswordDtoToJson(PicturePasswordDto instance) =>
    <String, dynamic>{
      'pictures': instance.pictures
          ?.map((e) => _$PicturePasswordDtoPicturesEnumEnumMap[e]!)
          .toList(),
    };

const _$PicturePasswordDtoPicturesEnumEnumMap = {
  PicturePasswordDtoPicturesEnum.cat: 'cat',
  PicturePasswordDtoPicturesEnum.dog: 'dog',
  PicturePasswordDtoPicturesEnum.fish: 'fish',
  PicturePasswordDtoPicturesEnum.bird: 'bird',
  PicturePasswordDtoPicturesEnum.rabbit: 'rabbit',
  PicturePasswordDtoPicturesEnum.sun: 'sun',
  PicturePasswordDtoPicturesEnum.moon: 'moon',
  PicturePasswordDtoPicturesEnum.star: 'star',
  PicturePasswordDtoPicturesEnum.tree: 'tree',
  PicturePasswordDtoPicturesEnum.flower: 'flower',
  PicturePasswordDtoPicturesEnum.apple: 'apple',
  PicturePasswordDtoPicturesEnum.car: 'car',
  PicturePasswordDtoPicturesEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
