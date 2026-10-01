// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_class_request_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentClassRequestDtoCWProxy {
  ParentClassRequestDto classId(String classId);

  ParentClassRequestDto child(ParentEventRequestDtoChild child);

  ParentClassRequestDto className(String className);

  ParentClassRequestDto school(String school);

  ParentClassRequestDto teacher(String teacher);

  ParentClassRequestDto requestedAt(DateTime requestedAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentClassRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentClassRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentClassRequestDto call({
    String classId,
    ParentEventRequestDtoChild child,
    String className,
    String school,
    String teacher,
    DateTime requestedAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentClassRequestDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentClassRequestDto.copyWith.fieldName(...)`
class _$ParentClassRequestDtoCWProxyImpl
    implements _$ParentClassRequestDtoCWProxy {
  const _$ParentClassRequestDtoCWProxyImpl(this._value);

  final ParentClassRequestDto _value;

  @override
  ParentClassRequestDto classId(String classId) => this(classId: classId);

  @override
  ParentClassRequestDto child(ParentEventRequestDtoChild child) =>
      this(child: child);

  @override
  ParentClassRequestDto className(String className) =>
      this(className: className);

  @override
  ParentClassRequestDto school(String school) => this(school: school);

  @override
  ParentClassRequestDto teacher(String teacher) => this(teacher: teacher);

  @override
  ParentClassRequestDto requestedAt(DateTime requestedAt) =>
      this(requestedAt: requestedAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentClassRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentClassRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentClassRequestDto call({
    Object? classId = const $CopyWithPlaceholder(),
    Object? child = const $CopyWithPlaceholder(),
    Object? className = const $CopyWithPlaceholder(),
    Object? school = const $CopyWithPlaceholder(),
    Object? teacher = const $CopyWithPlaceholder(),
    Object? requestedAt = const $CopyWithPlaceholder(),
  }) {
    return ParentClassRequestDto(
      classId: classId == const $CopyWithPlaceholder()
          ? _value.classId
          // ignore: cast_nullable_to_non_nullable
          : classId as String,
      child: child == const $CopyWithPlaceholder()
          ? _value.child
          // ignore: cast_nullable_to_non_nullable
          : child as ParentEventRequestDtoChild,
      className: className == const $CopyWithPlaceholder()
          ? _value.className
          // ignore: cast_nullable_to_non_nullable
          : className as String,
      school: school == const $CopyWithPlaceholder()
          ? _value.school
          // ignore: cast_nullable_to_non_nullable
          : school as String,
      teacher: teacher == const $CopyWithPlaceholder()
          ? _value.teacher
          // ignore: cast_nullable_to_non_nullable
          : teacher as String,
      requestedAt: requestedAt == const $CopyWithPlaceholder()
          ? _value.requestedAt
          // ignore: cast_nullable_to_non_nullable
          : requestedAt as DateTime,
    );
  }
}

extension $ParentClassRequestDtoCopyWith on ParentClassRequestDto {
  /// Returns a callable class that can be used as follows: `instanceOfParentClassRequestDto.copyWith(...)` or like so:`instanceOfParentClassRequestDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentClassRequestDtoCWProxy get copyWith =>
      _$ParentClassRequestDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentClassRequestDto _$ParentClassRequestDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ParentClassRequestDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'classId',
      'child',
      'className',
      'school',
      'teacher',
      'requestedAt',
    ],
  );
  final val = ParentClassRequestDto(
    classId: $checkedConvert('classId', (v) => v as String),
    child: $checkedConvert(
      'child',
      (v) => ParentEventRequestDtoChild.fromJson(v as Map<String, dynamic>),
    ),
    className: $checkedConvert('className', (v) => v as String),
    school: $checkedConvert('school', (v) => v as String),
    teacher: $checkedConvert('teacher', (v) => v as String),
    requestedAt: $checkedConvert(
      'requestedAt',
      (v) => DateTime.parse(v as String),
    ),
  );
  return val;
});

Map<String, dynamic> _$ParentClassRequestDtoToJson(
  ParentClassRequestDto instance,
) => <String, dynamic>{
  'classId': instance.classId,
  'child': instance.child.toJson(),
  'className': instance.className,
  'school': instance.school,
  'teacher': instance.teacher,
  'requestedAt': instance.requestedAt.toIso8601String(),
};
