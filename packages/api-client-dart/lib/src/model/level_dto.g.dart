// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'level_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LevelDtoCWProxy {
  LevelDto number(num number);

  LevelDto minXp(num minXp);

  LevelDto nextMinXp(num? nextMinXp);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LevelDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LevelDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LevelDto call({num number, num minXp, num? nextMinXp});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLevelDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLevelDto.copyWith.fieldName(...)`
class _$LevelDtoCWProxyImpl implements _$LevelDtoCWProxy {
  const _$LevelDtoCWProxyImpl(this._value);

  final LevelDto _value;

  @override
  LevelDto number(num number) => this(number: number);

  @override
  LevelDto minXp(num minXp) => this(minXp: minXp);

  @override
  LevelDto nextMinXp(num? nextMinXp) => this(nextMinXp: nextMinXp);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LevelDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LevelDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LevelDto call({
    Object? number = const $CopyWithPlaceholder(),
    Object? minXp = const $CopyWithPlaceholder(),
    Object? nextMinXp = const $CopyWithPlaceholder(),
  }) {
    return LevelDto(
      number: number == const $CopyWithPlaceholder()
          ? _value.number
          // ignore: cast_nullable_to_non_nullable
          : number as num,
      minXp: minXp == const $CopyWithPlaceholder()
          ? _value.minXp
          // ignore: cast_nullable_to_non_nullable
          : minXp as num,
      nextMinXp: nextMinXp == const $CopyWithPlaceholder()
          ? _value.nextMinXp
          // ignore: cast_nullable_to_non_nullable
          : nextMinXp as num?,
    );
  }
}

extension $LevelDtoCopyWith on LevelDto {
  /// Returns a callable class that can be used as follows: `instanceOfLevelDto.copyWith(...)` or like so:`instanceOfLevelDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LevelDtoCWProxy get copyWith => _$LevelDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LevelDto _$LevelDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LevelDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['number', 'minXp', 'nextMinXp']);
      final val = LevelDto(
        number: $checkedConvert('number', (v) => v as num),
        minXp: $checkedConvert('minXp', (v) => v as num),
        nextMinXp: $checkedConvert('nextMinXp', (v) => v as num?),
      );
      return val;
    });

Map<String, dynamic> _$LevelDtoToJson(LevelDto instance) => <String, dynamic>{
  'number': instance.number,
  'minXp': instance.minXp,
  'nextMinXp': instance.nextMinXp,
};
