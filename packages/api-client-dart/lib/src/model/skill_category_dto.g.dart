// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'skill_category_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SkillCategoryDtoCWProxy {
  SkillCategoryDto key(SkillCategoryDtoKeyEnum key);

  SkillCategoryDto skills(List<SkillDto> skills);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SkillCategoryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SkillCategoryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SkillCategoryDto call({SkillCategoryDtoKeyEnum key, List<SkillDto> skills});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSkillCategoryDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSkillCategoryDto.copyWith.fieldName(...)`
class _$SkillCategoryDtoCWProxyImpl implements _$SkillCategoryDtoCWProxy {
  const _$SkillCategoryDtoCWProxyImpl(this._value);

  final SkillCategoryDto _value;

  @override
  SkillCategoryDto key(SkillCategoryDtoKeyEnum key) => this(key: key);

  @override
  SkillCategoryDto skills(List<SkillDto> skills) => this(skills: skills);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SkillCategoryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SkillCategoryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SkillCategoryDto call({
    Object? key = const $CopyWithPlaceholder(),
    Object? skills = const $CopyWithPlaceholder(),
  }) {
    return SkillCategoryDto(
      key: key == const $CopyWithPlaceholder()
          ? _value.key
          // ignore: cast_nullable_to_non_nullable
          : key as SkillCategoryDtoKeyEnum,
      skills: skills == const $CopyWithPlaceholder()
          ? _value.skills
          // ignore: cast_nullable_to_non_nullable
          : skills as List<SkillDto>,
    );
  }
}

extension $SkillCategoryDtoCopyWith on SkillCategoryDto {
  /// Returns a callable class that can be used as follows: `instanceOfSkillCategoryDto.copyWith(...)` or like so:`instanceOfSkillCategoryDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SkillCategoryDtoCWProxy get copyWith => _$SkillCategoryDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SkillCategoryDto _$SkillCategoryDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SkillCategoryDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['key', 'skills']);
      final val = SkillCategoryDto(
        key: $checkedConvert(
          'key',
          (v) => $enumDecode(
            _$SkillCategoryDtoKeyEnumEnumMap,
            v,
            unknownValue: SkillCategoryDtoKeyEnum.unknownDefaultOpenApi,
          ),
        ),
        skills: $checkedConvert(
          'skills',
          (v) => (v as List<dynamic>)
              .map((e) => SkillDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$SkillCategoryDtoToJson(SkillCategoryDto instance) =>
    <String, dynamic>{
      'key': _$SkillCategoryDtoKeyEnumEnumMap[instance.key]!,
      'skills': instance.skills.map((e) => e.toJson()).toList(),
    };

const _$SkillCategoryDtoKeyEnumEnumMap = {
  SkillCategoryDtoKeyEnum.logic: 'logic',
  SkillCategoryDtoKeyEnum.web: 'web',
  SkillCategoryDtoKeyEnum.python: 'python',
  SkillCategoryDtoKeyEnum.teamwork: 'teamwork',
  SkillCategoryDtoKeyEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
