// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'skill_map_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SkillMapDtoCWProxy {
  SkillMapDto categories(List<SkillCategoryDto> categories);

  SkillMapDto learned(num learned);

  SkillMapDto total(num total);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SkillMapDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SkillMapDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SkillMapDto call({List<SkillCategoryDto> categories, num learned, num total});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSkillMapDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSkillMapDto.copyWith.fieldName(...)`
class _$SkillMapDtoCWProxyImpl implements _$SkillMapDtoCWProxy {
  const _$SkillMapDtoCWProxyImpl(this._value);

  final SkillMapDto _value;

  @override
  SkillMapDto categories(List<SkillCategoryDto> categories) =>
      this(categories: categories);

  @override
  SkillMapDto learned(num learned) => this(learned: learned);

  @override
  SkillMapDto total(num total) => this(total: total);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SkillMapDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SkillMapDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SkillMapDto call({
    Object? categories = const $CopyWithPlaceholder(),
    Object? learned = const $CopyWithPlaceholder(),
    Object? total = const $CopyWithPlaceholder(),
  }) {
    return SkillMapDto(
      categories: categories == const $CopyWithPlaceholder()
          ? _value.categories
          // ignore: cast_nullable_to_non_nullable
          : categories as List<SkillCategoryDto>,
      learned: learned == const $CopyWithPlaceholder()
          ? _value.learned
          // ignore: cast_nullable_to_non_nullable
          : learned as num,
      total: total == const $CopyWithPlaceholder()
          ? _value.total
          // ignore: cast_nullable_to_non_nullable
          : total as num,
    );
  }
}

extension $SkillMapDtoCopyWith on SkillMapDto {
  /// Returns a callable class that can be used as follows: `instanceOfSkillMapDto.copyWith(...)` or like so:`instanceOfSkillMapDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SkillMapDtoCWProxy get copyWith => _$SkillMapDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SkillMapDto _$SkillMapDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SkillMapDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['categories', 'learned', 'total']);
      final val = SkillMapDto(
        categories: $checkedConvert(
          'categories',
          (v) => (v as List<dynamic>)
              .map((e) => SkillCategoryDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        learned: $checkedConvert('learned', (v) => v as num),
        total: $checkedConvert('total', (v) => v as num),
      );
      return val;
    });

Map<String, dynamic> _$SkillMapDtoToJson(SkillMapDto instance) =>
    <String, dynamic>{
      'categories': instance.categories.map((e) => e.toJson()).toList(),
      'learned': instance.learned,
      'total': instance.total,
    };
