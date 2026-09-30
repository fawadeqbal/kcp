// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'premium_info_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PremiumInfoDtoCWProxy {
  PremiumInfoDto active(bool active);

  PremiumInfoDto source_(PremiumInfoDtoSource_Enum? source_);

  PremiumInfoDto until(DateTime? until);

  PremiumInfoDto trialEndsAt(DateTime? trialEndsAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PremiumInfoDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PremiumInfoDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PremiumInfoDto call({
    bool active,
    PremiumInfoDtoSource_Enum? source_,
    DateTime? until,
    DateTime? trialEndsAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPremiumInfoDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPremiumInfoDto.copyWith.fieldName(...)`
class _$PremiumInfoDtoCWProxyImpl implements _$PremiumInfoDtoCWProxy {
  const _$PremiumInfoDtoCWProxyImpl(this._value);

  final PremiumInfoDto _value;

  @override
  PremiumInfoDto active(bool active) => this(active: active);

  @override
  PremiumInfoDto source_(PremiumInfoDtoSource_Enum? source_) =>
      this(source_: source_);

  @override
  PremiumInfoDto until(DateTime? until) => this(until: until);

  @override
  PremiumInfoDto trialEndsAt(DateTime? trialEndsAt) =>
      this(trialEndsAt: trialEndsAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PremiumInfoDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PremiumInfoDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PremiumInfoDto call({
    Object? active = const $CopyWithPlaceholder(),
    Object? source_ = const $CopyWithPlaceholder(),
    Object? until = const $CopyWithPlaceholder(),
    Object? trialEndsAt = const $CopyWithPlaceholder(),
  }) {
    return PremiumInfoDto(
      active: active == const $CopyWithPlaceholder()
          ? _value.active
          // ignore: cast_nullable_to_non_nullable
          : active as bool,
      source_: source_ == const $CopyWithPlaceholder()
          ? _value.source_
          // ignore: cast_nullable_to_non_nullable
          : source_ as PremiumInfoDtoSource_Enum?,
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

extension $PremiumInfoDtoCopyWith on PremiumInfoDto {
  /// Returns a callable class that can be used as follows: `instanceOfPremiumInfoDto.copyWith(...)` or like so:`instanceOfPremiumInfoDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PremiumInfoDtoCWProxy get copyWith => _$PremiumInfoDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PremiumInfoDto _$PremiumInfoDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PremiumInfoDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['active', 'source', 'until', 'trialEndsAt'],
      );
      final val = PremiumInfoDto(
        active: $checkedConvert('active', (v) => v as bool),
        source_: $checkedConvert(
          'source',
          (v) => $enumDecodeNullable(
            _$PremiumInfoDtoSource_EnumEnumMap,
            v,
            unknownValue: PremiumInfoDtoSource_Enum.unknownDefaultOpenApi,
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

Map<String, dynamic> _$PremiumInfoDtoToJson(PremiumInfoDto instance) =>
    <String, dynamic>{
      'active': instance.active,
      'source': _$PremiumInfoDtoSource_EnumEnumMap[instance.source_],
      'until': instance.until?.toIso8601String(),
      'trialEndsAt': instance.trialEndsAt?.toIso8601String(),
    };

const _$PremiumInfoDtoSource_EnumEnumMap = {
  PremiumInfoDtoSource_Enum.subscription: 'subscription',
  PremiumInfoDtoSource_Enum.grant: 'grant',
  PremiumInfoDtoSource_Enum.trial: 'trial',
  PremiumInfoDtoSource_Enum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
