// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lesson_progress_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LessonProgressDtoCWProxy {
  LessonProgressDto status(LessonProgressDtoStatusEnum status);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LessonProgressDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LessonProgressDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LessonProgressDto call({LessonProgressDtoStatusEnum status});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLessonProgressDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLessonProgressDto.copyWith.fieldName(...)`
class _$LessonProgressDtoCWProxyImpl implements _$LessonProgressDtoCWProxy {
  const _$LessonProgressDtoCWProxyImpl(this._value);

  final LessonProgressDto _value;

  @override
  LessonProgressDto status(LessonProgressDtoStatusEnum status) =>
      this(status: status);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LessonProgressDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LessonProgressDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LessonProgressDto call({Object? status = const $CopyWithPlaceholder()}) {
    return LessonProgressDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as LessonProgressDtoStatusEnum,
    );
  }
}

extension $LessonProgressDtoCopyWith on LessonProgressDto {
  /// Returns a callable class that can be used as follows: `instanceOfLessonProgressDto.copyWith(...)` or like so:`instanceOfLessonProgressDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LessonProgressDtoCWProxy get copyWith =>
      _$LessonProgressDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LessonProgressDto _$LessonProgressDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LessonProgressDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['status']);
      final val = LessonProgressDto(
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$LessonProgressDtoStatusEnumEnumMap,
            v,
            unknownValue: LessonProgressDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$LessonProgressDtoToJson(LessonProgressDto instance) =>
    <String, dynamic>{
      'status': _$LessonProgressDtoStatusEnumEnumMap[instance.status]!,
    };

const _$LessonProgressDtoStatusEnumEnumMap = {
  LessonProgressDtoStatusEnum.NOT_STARTED: 'NOT_STARTED',
  LessonProgressDtoStatusEnum.STARTED: 'STARTED',
  LessonProgressDtoStatusEnum.COMPLETED: 'COMPLETED',
  LessonProgressDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
