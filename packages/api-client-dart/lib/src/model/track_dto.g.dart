// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'track_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$TrackDtoCWProxy {
  TrackDto id(String id);

  TrackDto title(String title);

  TrackDto ageFrom(num? ageFrom);

  TrackDto ageTo(num? ageTo);

  TrackDto modules(List<ModuleDto> modules);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `TrackDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// TrackDto(...).copyWith(id: 12, name: "My name")
  /// ````
  TrackDto call({
    String id,
    String title,
    num? ageFrom,
    num? ageTo,
    List<ModuleDto> modules,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfTrackDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfTrackDto.copyWith.fieldName(...)`
class _$TrackDtoCWProxyImpl implements _$TrackDtoCWProxy {
  const _$TrackDtoCWProxyImpl(this._value);

  final TrackDto _value;

  @override
  TrackDto id(String id) => this(id: id);

  @override
  TrackDto title(String title) => this(title: title);

  @override
  TrackDto ageFrom(num? ageFrom) => this(ageFrom: ageFrom);

  @override
  TrackDto ageTo(num? ageTo) => this(ageTo: ageTo);

  @override
  TrackDto modules(List<ModuleDto> modules) => this(modules: modules);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `TrackDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// TrackDto(...).copyWith(id: 12, name: "My name")
  /// ````
  TrackDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? title = const $CopyWithPlaceholder(),
    Object? ageFrom = const $CopyWithPlaceholder(),
    Object? ageTo = const $CopyWithPlaceholder(),
    Object? modules = const $CopyWithPlaceholder(),
  }) {
    return TrackDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      title: title == const $CopyWithPlaceholder()
          ? _value.title
          // ignore: cast_nullable_to_non_nullable
          : title as String,
      ageFrom: ageFrom == const $CopyWithPlaceholder()
          ? _value.ageFrom
          // ignore: cast_nullable_to_non_nullable
          : ageFrom as num?,
      ageTo: ageTo == const $CopyWithPlaceholder()
          ? _value.ageTo
          // ignore: cast_nullable_to_non_nullable
          : ageTo as num?,
      modules: modules == const $CopyWithPlaceholder()
          ? _value.modules
          // ignore: cast_nullable_to_non_nullable
          : modules as List<ModuleDto>,
    );
  }
}

extension $TrackDtoCopyWith on TrackDto {
  /// Returns a callable class that can be used as follows: `instanceOfTrackDto.copyWith(...)` or like so:`instanceOfTrackDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$TrackDtoCWProxy get copyWith => _$TrackDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TrackDto _$TrackDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('TrackDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['id', 'title', 'ageFrom', 'ageTo', 'modules'],
      );
      final val = TrackDto(
        id: $checkedConvert('id', (v) => v as String),
        title: $checkedConvert('title', (v) => v as String),
        ageFrom: $checkedConvert('ageFrom', (v) => v as num?),
        ageTo: $checkedConvert('ageTo', (v) => v as num?),
        modules: $checkedConvert(
          'modules',
          (v) => (v as List<dynamic>)
              .map((e) => ModuleDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$TrackDtoToJson(TrackDto instance) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'ageFrom': instance.ageFrom,
  'ageTo': instance.ageTo,
  'modules': instance.modules.map((e) => e.toJson()).toList(),
};
