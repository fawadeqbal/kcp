// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'practice_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PracticeDtoCWProxy {
  PracticeDto day(String day);

  PracticeDto xp(num xp);

  PracticeDto total(num total);

  PracticeDto done(bool done);

  PracticeDto answeredQuizIds(List<String> answeredQuizIds);

  PracticeDto quizzes(List<PracticeQuizDto> quizzes);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PracticeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PracticeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PracticeDto call({
    String day,
    num xp,
    num total,
    bool done,
    List<String> answeredQuizIds,
    List<PracticeQuizDto> quizzes,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPracticeDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPracticeDto.copyWith.fieldName(...)`
class _$PracticeDtoCWProxyImpl implements _$PracticeDtoCWProxy {
  const _$PracticeDtoCWProxyImpl(this._value);

  final PracticeDto _value;

  @override
  PracticeDto day(String day) => this(day: day);

  @override
  PracticeDto xp(num xp) => this(xp: xp);

  @override
  PracticeDto total(num total) => this(total: total);

  @override
  PracticeDto done(bool done) => this(done: done);

  @override
  PracticeDto answeredQuizIds(List<String> answeredQuizIds) =>
      this(answeredQuizIds: answeredQuizIds);

  @override
  PracticeDto quizzes(List<PracticeQuizDto> quizzes) => this(quizzes: quizzes);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PracticeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PracticeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PracticeDto call({
    Object? day = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? total = const $CopyWithPlaceholder(),
    Object? done = const $CopyWithPlaceholder(),
    Object? answeredQuizIds = const $CopyWithPlaceholder(),
    Object? quizzes = const $CopyWithPlaceholder(),
  }) {
    return PracticeDto(
      day: day == const $CopyWithPlaceholder()
          ? _value.day
          // ignore: cast_nullable_to_non_nullable
          : day as String,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      total: total == const $CopyWithPlaceholder()
          ? _value.total
          // ignore: cast_nullable_to_non_nullable
          : total as num,
      done: done == const $CopyWithPlaceholder()
          ? _value.done
          // ignore: cast_nullable_to_non_nullable
          : done as bool,
      answeredQuizIds: answeredQuizIds == const $CopyWithPlaceholder()
          ? _value.answeredQuizIds
          // ignore: cast_nullable_to_non_nullable
          : answeredQuizIds as List<String>,
      quizzes: quizzes == const $CopyWithPlaceholder()
          ? _value.quizzes
          // ignore: cast_nullable_to_non_nullable
          : quizzes as List<PracticeQuizDto>,
    );
  }
}

extension $PracticeDtoCopyWith on PracticeDto {
  /// Returns a callable class that can be used as follows: `instanceOfPracticeDto.copyWith(...)` or like so:`instanceOfPracticeDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PracticeDtoCWProxy get copyWith => _$PracticeDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PracticeDto _$PracticeDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PracticeDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'day',
          'xp',
          'total',
          'done',
          'answeredQuizIds',
          'quizzes',
        ],
      );
      final val = PracticeDto(
        day: $checkedConvert('day', (v) => v as String),
        xp: $checkedConvert('xp', (v) => v as num),
        total: $checkedConvert('total', (v) => v as num),
        done: $checkedConvert('done', (v) => v as bool),
        answeredQuizIds: $checkedConvert(
          'answeredQuizIds',
          (v) => (v as List<dynamic>).map((e) => e as String).toList(),
        ),
        quizzes: $checkedConvert(
          'quizzes',
          (v) => (v as List<dynamic>)
              .map((e) => PracticeQuizDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$PracticeDtoToJson(PracticeDto instance) =>
    <String, dynamic>{
      'day': instance.day,
      'xp': instance.xp,
      'total': instance.total,
      'done': instance.done,
      'answeredQuizIds': instance.answeredQuizIds,
      'quizzes': instance.quizzes.map((e) => e.toJson()).toList(),
    };
