// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'skill_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SkillDtoCWProxy {
  SkillDto key(String key);

  SkillDto name(String name);

  SkillDto lessonsDone(num lessonsDone);

  SkillDto lessonsTotal(num lessonsTotal);

  SkillDto learned(bool learned);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SkillDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SkillDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SkillDto call({
    String key,
    String name,
    num lessonsDone,
    num lessonsTotal,
    bool learned,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSkillDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSkillDto.copyWith.fieldName(...)`
class _$SkillDtoCWProxyImpl implements _$SkillDtoCWProxy {
  const _$SkillDtoCWProxyImpl(this._value);

  final SkillDto _value;

  @override
  SkillDto key(String key) => this(key: key);

  @override
  SkillDto name(String name) => this(name: name);

  @override
  SkillDto lessonsDone(num lessonsDone) => this(lessonsDone: lessonsDone);

  @override
  SkillDto lessonsTotal(num lessonsTotal) => this(lessonsTotal: lessonsTotal);

  @override
  SkillDto learned(bool learned) => this(learned: learned);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SkillDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SkillDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SkillDto call({
    Object? key = const $CopyWithPlaceholder(),
    Object? name = const $CopyWithPlaceholder(),
    Object? lessonsDone = const $CopyWithPlaceholder(),
    Object? lessonsTotal = const $CopyWithPlaceholder(),
    Object? learned = const $CopyWithPlaceholder(),
  }) {
    return SkillDto(
      key: key == const $CopyWithPlaceholder()
          ? _value.key
          // ignore: cast_nullable_to_non_nullable
          : key as String,
      name: name == const $CopyWithPlaceholder()
          ? _value.name
          // ignore: cast_nullable_to_non_nullable
          : name as String,
      lessonsDone: lessonsDone == const $CopyWithPlaceholder()
          ? _value.lessonsDone
          // ignore: cast_nullable_to_non_nullable
          : lessonsDone as num,
      lessonsTotal: lessonsTotal == const $CopyWithPlaceholder()
          ? _value.lessonsTotal
          // ignore: cast_nullable_to_non_nullable
          : lessonsTotal as num,
      learned: learned == const $CopyWithPlaceholder()
          ? _value.learned
          // ignore: cast_nullable_to_non_nullable
          : learned as bool,
    );
  }
}

extension $SkillDtoCopyWith on SkillDto {
  /// Returns a callable class that can be used as follows: `instanceOfSkillDto.copyWith(...)` or like so:`instanceOfSkillDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SkillDtoCWProxy get copyWith => _$SkillDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SkillDto _$SkillDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SkillDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'key',
          'name',
          'lessonsDone',
          'lessonsTotal',
          'learned',
        ],
      );
      final val = SkillDto(
        key: $checkedConvert('key', (v) => v as String),
        name: $checkedConvert('name', (v) => v as String),
        lessonsDone: $checkedConvert('lessonsDone', (v) => v as num),
        lessonsTotal: $checkedConvert('lessonsTotal', (v) => v as num),
        learned: $checkedConvert('learned', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$SkillDtoToJson(SkillDto instance) => <String, dynamic>{
  'key': instance.key,
  'name': instance.name,
  'lessonsDone': instance.lessonsDone,
  'lessonsTotal': instance.lessonsTotal,
  'learned': instance.learned,
};
