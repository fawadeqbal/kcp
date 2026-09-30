// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'child_premium_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ChildPremiumDtoCWProxy {
  ChildPremiumDto id(String id);

  ChildPremiumDto nickname(String nickname);

  ChildPremiumDto avatarKey(String avatarKey);

  ChildPremiumDto premium(bool premium);

  ChildPremiumDto source_(ChildPremiumDtoSource_Enum? source_);

  ChildPremiumDto until(DateTime? until);

  ChildPremiumDto trialEndsAt(DateTime? trialEndsAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChildPremiumDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChildPremiumDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChildPremiumDto call({
    String id,
    String nickname,
    String avatarKey,
    bool premium,
    ChildPremiumDtoSource_Enum? source_,
    DateTime? until,
    DateTime? trialEndsAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfChildPremiumDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfChildPremiumDto.copyWith.fieldName(...)`
class _$ChildPremiumDtoCWProxyImpl implements _$ChildPremiumDtoCWProxy {
  const _$ChildPremiumDtoCWProxyImpl(this._value);

  final ChildPremiumDto _value;

  @override
  ChildPremiumDto id(String id) => this(id: id);

  @override
  ChildPremiumDto nickname(String nickname) => this(nickname: nickname);

  @override
  ChildPremiumDto avatarKey(String avatarKey) => this(avatarKey: avatarKey);

  @override
  ChildPremiumDto premium(bool premium) => this(premium: premium);

  @override
  ChildPremiumDto source_(ChildPremiumDtoSource_Enum? source_) =>
      this(source_: source_);

  @override
  ChildPremiumDto until(DateTime? until) => this(until: until);

  @override
  ChildPremiumDto trialEndsAt(DateTime? trialEndsAt) =>
      this(trialEndsAt: trialEndsAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ChildPremiumDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ChildPremiumDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ChildPremiumDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? premium = const $CopyWithPlaceholder(),
    Object? source_ = const $CopyWithPlaceholder(),
    Object? until = const $CopyWithPlaceholder(),
    Object? trialEndsAt = const $CopyWithPlaceholder(),
  }) {
    return ChildPremiumDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as String,
      premium: premium == const $CopyWithPlaceholder()
          ? _value.premium
          // ignore: cast_nullable_to_non_nullable
          : premium as bool,
      source_: source_ == const $CopyWithPlaceholder()
          ? _value.source_
          // ignore: cast_nullable_to_non_nullable
          : source_ as ChildPremiumDtoSource_Enum?,
      until: until == const $CopyWithPlaceholder()
          ? _value.until
          // ignore: cast_nullable_to_non_nullable
          : until as DateTime?,
      trialEndsAt: trialEndsAt == const $CopyWithPlaceholder()
          ? _value.trialEndsAt
          // ignore: cast_nullable_to_non_nullable
          : trialEndsAt as DateTime?,
    );
  }
}

extension $ChildPremiumDtoCopyWith on ChildPremiumDto {
  /// Returns a callable class that can be used as follows: `instanceOfChildPremiumDto.copyWith(...)` or like so:`instanceOfChildPremiumDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ChildPremiumDtoCWProxy get copyWith => _$ChildPremiumDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ChildPremiumDto _$ChildPremiumDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ChildPremiumDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'nickname',
          'avatarKey',
          'premium',
          'source',
          'until',
          'trialEndsAt',
        ],
      );
      final val = ChildPremiumDto(
        id: $checkedConvert('id', (v) => v as String),
        nickname: $checkedConvert('nickname', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String),
        premium: $checkedConvert('premium', (v) => v as bool),
        source_: $checkedConvert(
          'source',
          (v) => $enumDecodeNullable(
            _$ChildPremiumDtoSource_EnumEnumMap,
            v,
            unknownValue: ChildPremiumDtoSource_Enum.unknownDefaultOpenApi,
          ),
        ),
        until: $checkedConvert(
          'until',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
        trialEndsAt: $checkedConvert(
          'trialEndsAt',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
      );
      return val;
    }, fieldKeyMap: const {'source_': 'source'});

Map<String, dynamic> _$ChildPremiumDtoToJson(ChildPremiumDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'nickname': instance.nickname,
      'avatarKey': instance.avatarKey,
      'premium': instance.premium,
      'source': _$ChildPremiumDtoSource_EnumEnumMap[instance.source_],
      'until': instance.until?.toIso8601String(),
      'trialEndsAt': instance.trialEndsAt?.toIso8601String(),
    };

const _$ChildPremiumDtoSource_EnumEnumMap = {
  ChildPremiumDtoSource_Enum.subscription: 'subscription',
  ChildPremiumDtoSource_Enum.grant: 'grant',
  ChildPremiumDtoSource_Enum.trial: 'trial',
  ChildPremiumDtoSource_Enum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
