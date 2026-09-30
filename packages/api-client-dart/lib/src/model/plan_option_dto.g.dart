// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'plan_option_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PlanOptionDtoCWProxy {
  PlanOptionDto key(PlanOptionDtoKeyEnum key);

  PlanOptionDto interval(PlanOptionDtoIntervalEnum interval);

  PlanOptionDto unitMinor(num unitMinor);

  PlanOptionDto extraUnitMinor(num extraUnitMinor);

  PlanOptionDto extraChildren(num extraChildren);

  PlanOptionDto totalMinor(num totalMinor);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PlanOptionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PlanOptionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PlanOptionDto call({
    PlanOptionDtoKeyEnum key,
    PlanOptionDtoIntervalEnum interval,
    num unitMinor,
    num extraUnitMinor,
    num extraChildren,
    num totalMinor,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPlanOptionDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPlanOptionDto.copyWith.fieldName(...)`
class _$PlanOptionDtoCWProxyImpl implements _$PlanOptionDtoCWProxy {
  const _$PlanOptionDtoCWProxyImpl(this._value);

  final PlanOptionDto _value;

  @override
  PlanOptionDto key(PlanOptionDtoKeyEnum key) => this(key: key);

  @override
  PlanOptionDto interval(PlanOptionDtoIntervalEnum interval) =>
      this(interval: interval);

  @override
  PlanOptionDto unitMinor(num unitMinor) => this(unitMinor: unitMinor);

  @override
  PlanOptionDto extraUnitMinor(num extraUnitMinor) =>
      this(extraUnitMinor: extraUnitMinor);

  @override
  PlanOptionDto extraChildren(num extraChildren) =>
      this(extraChildren: extraChildren);

  @override
  PlanOptionDto totalMinor(num totalMinor) => this(totalMinor: totalMinor);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PlanOptionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PlanOptionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PlanOptionDto call({
    Object? key = const $CopyWithPlaceholder(),
    Object? interval = const $CopyWithPlaceholder(),
    Object? unitMinor = const $CopyWithPlaceholder(),
    Object? extraUnitMinor = const $CopyWithPlaceholder(),
    Object? extraChildren = const $CopyWithPlaceholder(),
    Object? totalMinor = const $CopyWithPlaceholder(),
  }) {
    return PlanOptionDto(
      key: key == const $CopyWithPlaceholder()
          ? _value.key
          // ignore: cast_nullable_to_non_nullable
          : key as PlanOptionDtoKeyEnum,
      interval: interval == const $CopyWithPlaceholder()
          ? _value.interval
          // ignore: cast_nullable_to_non_nullable
          : interval as PlanOptionDtoIntervalEnum,
      unitMinor: unitMinor == const $CopyWithPlaceholder()
          ? _value.unitMinor
          // ignore: cast_nullable_to_non_nullable
          : unitMinor as num,
      extraUnitMinor: extraUnitMinor == const $CopyWithPlaceholder()
          ? _value.extraUnitMinor
          // ignore: cast_nullable_to_non_nullable
          : extraUnitMinor as num,
      extraChildren: extraChildren == const $CopyWithPlaceholder()
          ? _value.extraChildren
          // ignore: cast_nullable_to_non_nullable
          : extraChildren as num,
      totalMinor: totalMinor == const $CopyWithPlaceholder()
          ? _value.totalMinor
          // ignore: cast_nullable_to_non_nullable
          : totalMinor as num,
    );
  }
}

extension $PlanOptionDtoCopyWith on PlanOptionDto {
  /// Returns a callable class that can be used as follows: `instanceOfPlanOptionDto.copyWith(...)` or like so:`instanceOfPlanOptionDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PlanOptionDtoCWProxy get copyWith => _$PlanOptionDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PlanOptionDto _$PlanOptionDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PlanOptionDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'key',
          'interval',
          'unitMinor',
          'extraUnitMinor',
          'extraChildren',
          'totalMinor',
        ],
      );
      final val = PlanOptionDto(
        key: $checkedConvert(
          'key',
          (v) => $enumDecode(
            _$PlanOptionDtoKeyEnumEnumMap,
            v,
            unknownValue: PlanOptionDtoKeyEnum.unknownDefaultOpenApi,
          ),
        ),
        interval: $checkedConvert(
          'interval',
          (v) => $enumDecode(
            _$PlanOptionDtoIntervalEnumEnumMap,
            v,
            unknownValue: PlanOptionDtoIntervalEnum.unknownDefaultOpenApi,
          ),
        ),
        unitMinor: $checkedConvert('unitMinor', (v) => v as num),
        extraUnitMinor: $checkedConvert('extraUnitMinor', (v) => v as num),
        extraChildren: $checkedConvert('extraChildren', (v) => v as num),
        totalMinor: $checkedConvert('totalMinor', (v) => v as num),
      );
      return val;
    });

Map<String, dynamic> _$PlanOptionDtoToJson(PlanOptionDto instance) =>
    <String, dynamic>{
      'key': _$PlanOptionDtoKeyEnumEnumMap[instance.key]!,
      'interval': _$PlanOptionDtoIntervalEnumEnumMap[instance.interval]!,
      'unitMinor': instance.unitMinor,
      'extraUnitMinor': instance.extraUnitMinor,
      'extraChildren': instance.extraChildren,
      'totalMinor': instance.totalMinor,
    };

const _$PlanOptionDtoKeyEnumEnumMap = {
  PlanOptionDtoKeyEnum.monthly: 'monthly',
  PlanOptionDtoKeyEnum.yearly: 'yearly',
  PlanOptionDtoKeyEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};

const _$PlanOptionDtoIntervalEnumEnumMap = {
  PlanOptionDtoIntervalEnum.MONTH: 'MONTH',
  PlanOptionDtoIntervalEnum.YEAR: 'YEAR',
  PlanOptionDtoIntervalEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
