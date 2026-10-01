// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'submission_result_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$SubmissionResultDtoCWProxy {
  SubmissionResultDto passed(bool passed);

  SubmissionResultDto results(List<CheckResultDto> results);

  SubmissionResultDto lessonCompleted(bool lessonCompleted);

  SubmissionResultDto nextLessonId(String? nextLessonId);

  SubmissionResultDto xpAwarded(num xpAwarded);

  SubmissionResultDto dailyCapReached(bool dailyCapReached);

  SubmissionResultDto badgesEarned(List<String> badgesEarned);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SubmissionResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SubmissionResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SubmissionResultDto call({
    bool passed,
    List<CheckResultDto> results,
    bool lessonCompleted,
    String? nextLessonId,
    num xpAwarded,
    bool dailyCapReached,
    List<String> badgesEarned,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfSubmissionResultDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfSubmissionResultDto.copyWith.fieldName(...)`
class _$SubmissionResultDtoCWProxyImpl implements _$SubmissionResultDtoCWProxy {
  const _$SubmissionResultDtoCWProxyImpl(this._value);

  final SubmissionResultDto _value;

  @override
  SubmissionResultDto passed(bool passed) => this(passed: passed);

  @override
  SubmissionResultDto results(List<CheckResultDto> results) =>
      this(results: results);

  @override
  SubmissionResultDto lessonCompleted(bool lessonCompleted) =>
      this(lessonCompleted: lessonCompleted);

  @override
  SubmissionResultDto nextLessonId(String? nextLessonId) =>
      this(nextLessonId: nextLessonId);

  @override
  SubmissionResultDto xpAwarded(num xpAwarded) => this(xpAwarded: xpAwarded);

  @override
  SubmissionResultDto dailyCapReached(bool dailyCapReached) =>
      this(dailyCapReached: dailyCapReached);

  @override
  SubmissionResultDto badgesEarned(List<String> badgesEarned) =>
      this(badgesEarned: badgesEarned);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `SubmissionResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// SubmissionResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  SubmissionResultDto call({
    Object? passed = const $CopyWithPlaceholder(),
    Object? results = const $CopyWithPlaceholder(),
    Object? lessonCompleted = const $CopyWithPlaceholder(),
    Object? nextLessonId = const $CopyWithPlaceholder(),
    Object? xpAwarded = const $CopyWithPlaceholder(),
    Object? dailyCapReached = const $CopyWithPlaceholder(),
    Object? badgesEarned = const $CopyWithPlaceholder(),
  }) {
    return SubmissionResultDto(
      passed: passed == const $CopyWithPlaceholder()
          ? _value.passed
          // ignore: cast_nullable_to_non_nullable
          : passed as bool,
      results: results == const $CopyWithPlaceholder()
          ? _value.results
          // ignore: cast_nullable_to_non_nullable
          : results as List<CheckResultDto>,
      lessonCompleted: lessonCompleted == const $CopyWithPlaceholder()
          ? _value.lessonCompleted
          // ignore: cast_nullable_to_non_nullable
          : lessonCompleted as bool,
      nextLessonId: nextLessonId == const $CopyWithPlaceholder()
          ? _value.nextLessonId
          // ignore: cast_nullable_to_non_nullable
          : nextLessonId as String?,
      xpAwarded: xpAwarded == const $CopyWithPlaceholder()
          ? _value.xpAwarded
          // ignore: cast_nullable_to_non_nullable
          : xpAwarded as num,
      dailyCapReached: dailyCapReached == const $CopyWithPlaceholder()
          ? _value.dailyCapReached
          // ignore: cast_nullable_to_non_nullable
          : dailyCapReached as bool,
      badgesEarned: badgesEarned == const $CopyWithPlaceholder()
          ? _value.badgesEarned
          // ignore: cast_nullable_to_non_nullable
          : badgesEarned as List<String>,
    );
  }
}

extension $SubmissionResultDtoCopyWith on SubmissionResultDto {
  /// Returns a callable class that can be used as follows: `instanceOfSubmissionResultDto.copyWith(...)` or like so:`instanceOfSubmissionResultDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$SubmissionResultDtoCWProxy get copyWith =>
      _$SubmissionResultDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

SubmissionResultDto _$SubmissionResultDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('SubmissionResultDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'passed',
          'results',
          'lessonCompleted',
          'nextLessonId',
          'xpAwarded',
          'dailyCapReached',
          'badgesEarned',
        ],
      );
      final val = SubmissionResultDto(
        passed: $checkedConvert('passed', (v) => v as bool),
        results: $checkedConvert(
          'results',
          (v) => (v as List<dynamic>)
              .map((e) => CheckResultDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        lessonCompleted: $checkedConvert('lessonCompleted', (v) => v as bool),
        nextLessonId: $checkedConvert('nextLessonId', (v) => v as String?),
        xpAwarded: $checkedConvert('xpAwarded', (v) => v as num),
        dailyCapReached: $checkedConvert('dailyCapReached', (v) => v as bool),
        badgesEarned: $checkedConvert(
          'badgesEarned',
          (v) => (v as List<dynamic>).map((e) => e as String).toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$SubmissionResultDtoToJson(
  SubmissionResultDto instance,
) => <String, dynamic>{
  'passed': instance.passed,
  'results': instance.results.map((e) => e.toJson()).toList(),
  'lessonCompleted': instance.lessonCompleted,
  'nextLessonId': instance.nextLessonId,
  'xpAwarded': instance.xpAwarded,
  'dailyCapReached': instance.dailyCapReached,
  'badgesEarned': instance.badgesEarned,
};
