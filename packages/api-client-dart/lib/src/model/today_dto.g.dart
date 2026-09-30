// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'today_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$TodayDtoCWProxy {
  TodayDto xp(num xp);

  TodayDto goalXp(num goalXp);

  TodayDto capXp(num capXp);

  TodayDto capReached(bool capReached);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `TodayDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// TodayDto(...).copyWith(id: 12, name: "My name")
  /// ````
  TodayDto call({num xp, num goalXp, num capXp, bool capReached});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfTodayDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfTodayDto.copyWith.fieldName(...)`
class _$TodayDtoCWProxyImpl implements _$TodayDtoCWProxy {
  const _$TodayDtoCWProxyImpl(this._value);

  final TodayDto _value;

  @override
  TodayDto xp(num xp) => this(xp: xp);

  @override
  TodayDto goalXp(num goalXp) => this(goalXp: goalXp);

  @override
  TodayDto capXp(num capXp) => this(capXp: capXp);

  @override
  TodayDto capReached(bool capReached) => this(capReached: capReached);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `TodayDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// TodayDto(...).copyWith(id: 12, name: "My name")
  /// ````
  TodayDto call({
    Object? xp = const $CopyWithPlaceholder(),
    Object? goalXp = const $CopyWithPlaceholder(),
    Object? capXp = const $CopyWithPlaceholder(),
    Object? capReached = const $CopyWithPlaceholder(),
  }) {
    return TodayDto(
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      goalXp: goalXp == const $CopyWithPlaceholder()
          ? _value.goalXp
          // ignore: cast_nullable_to_non_nullable
          : goalXp as num,
      capXp: capXp == const $CopyWithPlaceholder()
          ? _value.capXp
          // ignore: cast_nullable_to_non_nullable
          : capXp as num,
      capReached: capReached == const $CopyWithPlaceholder()
          ? _value.capReached
          // ignore: cast_nullable_to_non_nullable
          : capReached as bool,
    );
  }
}

extension $TodayDtoCopyWith on TodayDto {
  /// Returns a callable class that can be used as follows: `instanceOfTodayDto.copyWith(...)` or like so:`instanceOfTodayDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$TodayDtoCWProxy get copyWith => _$TodayDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TodayDto _$TodayDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('TodayDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['xp', 'goalXp', 'capXp', 'capReached'],
      );
      final val = TodayDto(
        xp: $checkedConvert('xp', (v) => v as num),
        goalXp: $checkedConvert('goalXp', (v) => v as num),
        capXp: $checkedConvert('capXp', (v) => v as num),
        capReached: $checkedConvert('capReached', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$TodayDtoToJson(TodayDto instance) => <String, dynamic>{
  'xp': instance.xp,
  'goalXp': instance.goalXp,
  'capXp': instance.capXp,
  'capReached': instance.capReached,
};
