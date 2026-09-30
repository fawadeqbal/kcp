// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'update_child_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$UpdateChildDtoCWProxy {
  UpdateChildDto nickname(String? nickname);

  UpdateChildDto avatarKey(UpdateChildDtoAvatarKeyEnum? avatarKey);

  UpdateChildDto languageCode(String? languageCode);

  UpdateChildDto regionId(String? regionId);

  UpdateChildDto cityId(String? cityId);

  UpdateChildDto streakReminders(bool? streakReminders);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `UpdateChildDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// UpdateChildDto(...).copyWith(id: 12, name: "My name")
  /// ````
  UpdateChildDto call({
    String? nickname,
    UpdateChildDtoAvatarKeyEnum? avatarKey,
    String? languageCode,
    String? regionId,
    String? cityId,
    bool? streakReminders,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfUpdateChildDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfUpdateChildDto.copyWith.fieldName(...)`
class _$UpdateChildDtoCWProxyImpl implements _$UpdateChildDtoCWProxy {
  const _$UpdateChildDtoCWProxyImpl(this._value);

  final UpdateChildDto _value;

  @override
  UpdateChildDto nickname(String? nickname) => this(nickname: nickname);

  @override
  UpdateChildDto avatarKey(UpdateChildDtoAvatarKeyEnum? avatarKey) =>
      this(avatarKey: avatarKey);

  @override
  UpdateChildDto languageCode(String? languageCode) =>
      this(languageCode: languageCode);

  @override
  UpdateChildDto regionId(String? regionId) => this(regionId: regionId);

  @override
  UpdateChildDto cityId(String? cityId) => this(cityId: cityId);

  @override
  UpdateChildDto streakReminders(bool? streakReminders) =>
      this(streakReminders: streakReminders);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `UpdateChildDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// UpdateChildDto(...).copyWith(id: 12, name: "My name")
  /// ````
  UpdateChildDto call({
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? languageCode = const $CopyWithPlaceholder(),
    Object? regionId = const $CopyWithPlaceholder(),
    Object? cityId = const $CopyWithPlaceholder(),
    Object? streakReminders = const $CopyWithPlaceholder(),
  }) {
    return UpdateChildDto(
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String?,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as UpdateChildDtoAvatarKeyEnum?,
      languageCode: languageCode == const $CopyWithPlaceholder()
          ? _value.languageCode
          // ignore: cast_nullable_to_non_nullable
          : languageCode as String?,
      regionId: regionId == const $CopyWithPlaceholder()
          ? _value.regionId
          // ignore: cast_nullable_to_non_nullable
          : regionId as String?,
      cityId: cityId == const $CopyWithPlaceholder()
          ? _value.cityId
          // ignore: cast_nullable_to_non_nullable
          : cityId as String?,
      streakReminders: streakReminders == const $CopyWithPlaceholder()
          ? _value.streakReminders
          // ignore: cast_nullable_to_non_nullable
          : streakReminders as bool?,
    );
  }
}

extension $UpdateChildDtoCopyWith on UpdateChildDto {
  /// Returns a callable class that can be used as follows: `instanceOfUpdateChildDto.copyWith(...)` or like so:`instanceOfUpdateChildDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$UpdateChildDtoCWProxy get copyWith => _$UpdateChildDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UpdateChildDto _$UpdateChildDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('UpdateChildDto', json, ($checkedConvert) {
      final val = UpdateChildDto(
        nickname: $checkedConvert('nickname', (v) => v as String?),
        avatarKey: $checkedConvert(
          'avatarKey',
          (v) => $enumDecodeNullable(
            _$UpdateChildDtoAvatarKeyEnumEnumMap,
            v,
            unknownValue: UpdateChildDtoAvatarKeyEnum.unknownDefaultOpenApi,
          ),
        ),
        languageCode: $checkedConvert('languageCode', (v) => v as String?),
        regionId: $checkedConvert('regionId', (v) => v as String?),
        cityId: $checkedConvert('cityId', (v) => v as String?),
        streakReminders: $checkedConvert('streakReminders', (v) => v as bool?),
      );
      return val;
    });

Map<String, dynamic> _$UpdateChildDtoToJson(UpdateChildDto instance) =>
    <String, dynamic>{
      'nickname': ?instance.nickname,
      'avatarKey': ?_$UpdateChildDtoAvatarKeyEnumEnumMap[instance.avatarKey],
      'languageCode': ?instance.languageCode,
      'regionId': ?instance.regionId,
      'cityId': ?instance.cityId,
      'streakReminders': ?instance.streakReminders,
    };

const _$UpdateChildDtoAvatarKeyEnumEnumMap = {
  UpdateChildDtoAvatarKeyEnum.rocket: 'rocket',
  UpdateChildDtoAvatarKeyEnum.star: 'star',
  UpdateChildDtoAvatarKeyEnum.bolt: 'bolt',
  UpdateChildDtoAvatarKeyEnum.planet: 'planet',
  UpdateChildDtoAvatarKeyEnum.robot: 'robot',
  UpdateChildDtoAvatarKeyEnum.leaf: 'leaf',
  UpdateChildDtoAvatarKeyEnum.moon: 'moon',
  UpdateChildDtoAvatarKeyEnum.sun: 'sun',
  UpdateChildDtoAvatarKeyEnum.cube: 'cube',
  UpdateChildDtoAvatarKeyEnum.gamepad: 'gamepad',
  UpdateChildDtoAvatarKeyEnum.music: 'music',
  UpdateChildDtoAvatarKeyEnum.code: 'code',
  UpdateChildDtoAvatarKeyEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
