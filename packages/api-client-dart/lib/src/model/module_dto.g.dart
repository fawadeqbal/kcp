// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'module_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ModuleDtoCWProxy {
  ModuleDto id(String id);

  ModuleDto title(String title);

  ModuleDto description(String description);

  ModuleDto lessons(List<LessonSummaryDto> lessons);

  ModuleDto project(ModuleProjectDto? project);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ModuleDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ModuleDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ModuleDto call({
    String id,
    String title,
    String description,
    List<LessonSummaryDto> lessons,
    ModuleProjectDto? project,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfModuleDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfModuleDto.copyWith.fieldName(...)`
class _$ModuleDtoCWProxyImpl implements _$ModuleDtoCWProxy {
  const _$ModuleDtoCWProxyImpl(this._value);

  final ModuleDto _value;

  @override
  ModuleDto id(String id) => this(id: id);

  @override
  ModuleDto title(String title) => this(title: title);

  @override
  ModuleDto description(String description) => this(description: description);

  @override
  ModuleDto lessons(List<LessonSummaryDto> lessons) => this(lessons: lessons);

  @override
  ModuleDto project(ModuleProjectDto? project) => this(project: project);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ModuleDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ModuleDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ModuleDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? title = const $CopyWithPlaceholder(),
    Object? description = const $CopyWithPlaceholder(),
    Object? lessons = const $CopyWithPlaceholder(),
    Object? project = const $CopyWithPlaceholder(),
  }) {
    return ModuleDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      title: title == const $CopyWithPlaceholder()
          ? _value.title
          // ignore: cast_nullable_to_non_nullable
          : title as String,
      description: description == const $CopyWithPlaceholder()
          ? _value.description
          // ignore: cast_nullable_to_non_nullable
          : description as String,
      lessons: lessons == const $CopyWithPlaceholder()
          ? _value.lessons
          // ignore: cast_nullable_to_non_nullable
          : lessons as List<LessonSummaryDto>,
      project: project == const $CopyWithPlaceholder()
          ? _value.project
          // ignore: cast_nullable_to_non_nullable
          : project as ModuleProjectDto?,
    );
  }
}

extension $ModuleDtoCopyWith on ModuleDto {
  /// Returns a callable class that can be used as follows: `instanceOfModuleDto.copyWith(...)` or like so:`instanceOfModuleDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ModuleDtoCWProxy get copyWith => _$ModuleDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ModuleDto _$ModuleDtoFromJson(Map<String, dynamic> json) => $checkedCreate(
  'ModuleDto',
  json,
  ($checkedConvert) {
    $checkKeys(
      json,
      requiredKeys: const ['id', 'title', 'description', 'lessons', 'project'],
    );
    final val = ModuleDto(
      id: $checkedConvert('id', (v) => v as String),
      title: $checkedConvert('title', (v) => v as String),
      description: $checkedConvert('description', (v) => v as String),
      lessons: $checkedConvert(
        'lessons',
        (v) => (v as List<dynamic>)
            .map((e) => LessonSummaryDto.fromJson(e as Map<String, dynamic>))
            .toList(),
      ),
      project: $checkedConvert(
        'project',
        (v) => v == null
            ? null
            : ModuleProjectDto.fromJson(v as Map<String, dynamic>),
      ),
    );
    return val;
  },
);

Map<String, dynamic> _$ModuleDtoToJson(ModuleDto instance) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'description': instance.description,
  'lessons': instance.lessons.map((e) => e.toJson()).toList(),
  'project': instance.project?.toJson(),
};
