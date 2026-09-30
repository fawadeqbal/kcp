// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'season_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SeasonDtoCWProxy {
  SeasonDto id(String id);

  SeasonDto name(String name);

  SeasonDto startDay(String startDay);

  SeasonDto endDay(String? endDay);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SeasonDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SeasonDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SeasonDto call({String id, String name, String startDay, String? endDay});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSeasonDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSeasonDto.copyWith.fieldName(...)`
class _$SeasonDtoCWProxyImpl implements _$SeasonDtoCWProxy {
  const _$SeasonDtoCWProxyImpl(this._value);

  final SeasonDto _value;

  @override
  SeasonDto id(String id) => this(id: id);

  @override
  SeasonDto name(String name) => this(name: name);

  @override
  SeasonDto startDay(String startDay) => this(startDay: startDay);

  @override
  SeasonDto endDay(String? endDay) => this(endDay: endDay);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SeasonDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SeasonDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SeasonDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? startDay = const $CopyWithPlaceholder(),
    Object? endDay = const $CopyWithPlaceholder(),
  }) {
    return SeasonDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      name: name == const $CopyWithPlaceholder()
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      startDay: startDay == const $CopyWithPlaceholder()
          ? _value.startDay
          // ignore: cast_nullable_to_non_nullable
          : startDay as String,
      endDay: endDay == const $CopyWithPlaceholder()
          ? _value.endDay
          // ignore: cast_nullable_to_non_nullable
          : endDay as String?,
    );
  }
}

extension $SeasonDtoCopyWith on SeasonDto {
  /// Returns a callable class that can be used as follows: `instanceOfSeasonDto.copyWith(...)` or like so:`instanceOfSeasonDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SeasonDtoCWProxy get copyWith => _$SeasonDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SeasonDto _$SeasonDtoFromJson(Map<String, dynamic> json) => $checkedCreate(
  'SeasonDto',
  json,
  ($checkedConvert) {
    $checkKeys(json, requiredKeys: const ['id', 'name', 'startDay', 'endDay']);
    final val = SeasonDto(
      id: $checkedConvert('id', (v) => v as String),
      name: $checkedConvert('name', (v) => v as String),
      startDay: $checkedConvert('startDay', (v) => v as String),
      endDay: $checkedConvert('endDay', (v) => v as String?),
    );
    return val;
  },
);

Map<String, dynamic> _$SeasonDtoToJson(SeasonDto instance) => <String, dynamic>{
  'id': instance.id,
  'name': instance.name,
  'startDay': instance.startDay,
  'endDay': instance.endDay,
};
