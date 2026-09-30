// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'streak_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$StreakDtoCWProxy {
  StreakDto current(num current);

  StreakDto longest(num longest);

  StreakDto doneToday(bool doneToday);

  StreakDto freezes(num freezes);

  StreakDto freezesNeeded(num freezesNeeded);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StreakDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StreakDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StreakDto call({
    num current,
    num longest,
    bool doneToday,
    num freezes,
    num freezesNeeded,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfStreakDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfStreakDto.copyWith.fieldName(...)`
class _$StreakDtoCWProxyImpl implements _$StreakDtoCWProxy {
  const _$StreakDtoCWProxyImpl(this._value);

  final StreakDto _value;

  @override
  StreakDto current(num current) => this(current: current);

  @override
  StreakDto longest(num longest) => this(longest: longest);

  @override
  StreakDto doneToday(bool doneToday) => this(doneToday: doneToday);

  @override
  StreakDto freezes(num freezes) => this(freezes: freezes);

  @override
  StreakDto freezesNeeded(num freezesNeeded) =>
      this(freezesNeeded: freezesNeeded);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `StreakDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// StreakDto(...).copyWith(id: 12, name: "My name")
  /// ````
  StreakDto call({
    Object? current = const $CopyWithPlaceholder(),
    Object? longest = const $CopyWithPlaceholder(),
    Object? doneToday = const $CopyWithPlaceholder(),
    Object? freezes = const $CopyWithPlaceholder(),
    Object? freezesNeeded = const $CopyWithPlaceholder(),
  }) {
    return StreakDto(
      current: current == const $CopyWithPlaceholder()
          ? _value.current
          // ignore: cast_nullable_to_non_nullable
          : current as num,
      longest: longest == const $CopyWithPlaceholder()
          ? _value.longest
          // ignore: cast_nullable_to_non_nullable
          : longest as num,
      doneToday: doneToday == const $CopyWithPlaceholder()
          ? _value.doneToday
          // ignore: cast_nullable_to_non_nullable
          : doneToday as bool,
      freezes: freezes == const $CopyWithPlaceholder()
          ? _value.freezes
          // ignore: cast_nullable_to_non_nullable
          : freezes as num,
      freezesNeeded: freezesNeeded == const $CopyWithPlaceholder()
          ? _value.freezesNeeded
          // ignore: cast_nullable_to_non_nullable
          : freezesNeeded as num,
    );
  }
}

extension $StreakDtoCopyWith on StreakDto {
  /// Returns a callable class that can be used as follows: `instanceOfStreakDto.copyWith(...)` or like so:`instanceOfStreakDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$StreakDtoCWProxy get copyWith => _$StreakDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

StreakDto _$StreakDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('StreakDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'current',
          'longest',
          'doneToday',
          'freezes',
          'freezesNeeded',
        ],
      );
      final val = StreakDto(
        current: $checkedConvert('current', (v) => v as num),
        longest: $checkedConvert('longest', (v) => v as num),
        doneToday: $checkedConvert('doneToday', (v) => v as bool),
        freezes: $checkedConvert('freezes', (v) => v as num),
        freezesNeeded: $checkedConvert('freezesNeeded', (v) => v as num),
      );
      return val;
    });

Map<String, dynamic> _$StreakDtoToJson(StreakDto instance) => <String, dynamic>{
  'current': instance.current,
  'longest': instance.longest,
  'doneToday': instance.doneToday,
  'freezes': instance.freezes,
  'freezesNeeded': instance.freezesNeeded,
};
