// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'practice_progress_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PracticeProgressDtoCWProxy {
  PracticeProgressDto day(String day);

  PracticeProgressDto total(num total);

  PracticeProgressDto answered(num answered);

  PracticeProgressDto done(bool done);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PracticeProgressDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PracticeProgressDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PracticeProgressDto call({String day, num total, num answered, bool done});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPracticeProgressDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPracticeProgressDto.copyWith.fieldName(...)`
class _$PracticeProgressDtoCWProxyImpl implements _$PracticeProgressDtoCWProxy {
  const _$PracticeProgressDtoCWProxyImpl(this._value);

  final PracticeProgressDto _value;

  @override
  PracticeProgressDto day(String day) => this(day: day);

  @override
  PracticeProgressDto total(num total) => this(total: total);

  @override
  PracticeProgressDto answered(num answered) => this(answered: answered);

  @override
  PracticeProgressDto done(bool done) => this(done: done);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PracticeProgressDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PracticeProgressDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PracticeProgressDto call({
    Object? day = const $CopyWithPlaceholder(),
    Object? total = const $CopyWithPlaceholder(),
    Object? answered = const $CopyWithPlaceholder(),
    Object? done = const $CopyWithPlaceholder(),
  }) {
    return PracticeProgressDto(
      day: day == const $CopyWithPlaceholder()
          ? _value.day
          // ignore: cast_nullable_to_non_nullable
          : day as String,
      total: total == const $CopyWithPlaceholder()
          ? _value.total
          // ignore: cast_nullable_to_non_nullable
          : total as num,
      answered: answered == const $CopyWithPlaceholder()
          ? _value.answered
          // ignore: cast_nullable_to_non_nullable
          : answered as num,
      done: done == const $CopyWithPlaceholder()
          ? _value.done
          // ignore: cast_nullable_to_non_nullable
          : done as bool,
    );
  }
}

extension $PracticeProgressDtoCopyWith on PracticeProgressDto {
  /// Returns a callable class that can be used as follows: `instanceOfPracticeProgressDto.copyWith(...)` or like so:`instanceOfPracticeProgressDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PracticeProgressDtoCWProxy get copyWith =>
      _$PracticeProgressDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PracticeProgressDto _$PracticeProgressDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PracticeProgressDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['day', 'total', 'answered', 'done'],
      );
      final val = PracticeProgressDto(
        day: $checkedConvert('day', (v) => v as String),
        total: $checkedConvert('total', (v) => v as num),
        answered: $checkedConvert('answered', (v) => v as num),
        done: $checkedConvert('done', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$PracticeProgressDtoToJson(
  PracticeProgressDto instance,
) => <String, dynamic>{
  'day': instance.day,
  'total': instance.total,
  'answered': instance.answered,
  'done': instance.done,
};
