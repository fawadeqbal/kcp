// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'quiz_result_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$QuizResultDtoCWProxy {
  QuizResultDto correct(bool correct);

  QuizResultDto explanation(String? explanation);

  QuizResultDto reveal(QuizRevealDto? reveal);

  QuizResultDto xpAwarded(num xpAwarded);

  QuizResultDto dailyCapReached(bool dailyCapReached);

  QuizResultDto badgesEarned(List<String> badgesEarned);

  QuizResultDto practice(PracticeProgressDto? practice);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizResultDto call({
    bool correct,
    String? explanation,
    QuizRevealDto? reveal,
    num xpAwarded,
    bool dailyCapReached,
    List<String> badgesEarned,
    PracticeProgressDto? practice,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfQuizResultDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfQuizResultDto.copyWith.fieldName(...)`
class _$QuizResultDtoCWProxyImpl implements _$QuizResultDtoCWProxy {
  const _$QuizResultDtoCWProxyImpl(this._value);

  final QuizResultDto _value;

  @override
  QuizResultDto correct(bool correct) => this(correct: correct);

  @override
  QuizResultDto explanation(String? explanation) =>
      this(explanation: explanation);

  @override
  QuizResultDto reveal(QuizRevealDto? reveal) => this(reveal: reveal);

  @override
  QuizResultDto xpAwarded(num xpAwarded) => this(xpAwarded: xpAwarded);

  @override
  QuizResultDto dailyCapReached(bool dailyCapReached) =>
      this(dailyCapReached: dailyCapReached);

  @override
  QuizResultDto badgesEarned(List<String> badgesEarned) =>
      this(badgesEarned: badgesEarned);

  @override
  QuizResultDto practice(PracticeProgressDto? practice) =>
      this(practice: practice);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `QuizResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// QuizResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  QuizResultDto call({
    Object? correct = const $CopyWithPlaceholder(),
    Object? explanation = const $CopyWithPlaceholder(),
    Object? reveal = const $CopyWithPlaceholder(),
    Object? xpAwarded = const $CopyWithPlaceholder(),
    Object? dailyCapReached = const $CopyWithPlaceholder(),
    Object? badgesEarned = const $CopyWithPlaceholder(),
    Object? practice = const $CopyWithPlaceholder(),
  }) {
    return QuizResultDto(
      correct: correct == const $CopyWithPlaceholder()
          ? _value.correct
          // ignore: cast_nullable_to_non_nullable
          : correct as bool,
      explanation: explanation == const $CopyWithPlaceholder()
          ? _value.explanation
          // ignore: cast_nullable_to_non_nullable
          : explanation as String?,
      reveal: reveal == const $CopyWithPlaceholder()
          ? _value.reveal
          // ignore: cast_nullable_to_non_nullable
          : reveal as QuizRevealDto?,
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
      practice: practice == const $CopyWithPlaceholder()
          ? _value.practice
          // ignore: cast_nullable_to_non_nullable
          : practice as PracticeProgressDto?,
    );
  }
}

extension $QuizResultDtoCopyWith on QuizResultDto {
  /// Returns a callable class that can be used as follows: `instanceOfQuizResultDto.copyWith(...)` or like so:`instanceOfQuizResultDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$QuizResultDtoCWProxy get copyWith => _$QuizResultDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

QuizResultDto _$QuizResultDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('QuizResultDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'correct',
          'explanation',
          'reveal',
          'xpAwarded',
          'dailyCapReached',
          'badgesEarned',
          'practice',
        ],
      );
      final val = QuizResultDto(
        correct: $checkedConvert('correct', (v) => v as bool),
        explanation: $checkedConvert('explanation', (v) => v as String?),
        reveal: $checkedConvert(
          'reveal',
          (v) => v == null
              ? null
              : QuizRevealDto.fromJson(v as Map<String, dynamic>),
        ),
        xpAwarded: $checkedConvert('xpAwarded', (v) => v as num),
        dailyCapReached: $checkedConvert('dailyCapReached', (v) => v as bool),
        badgesEarned: $checkedConvert(
          'badgesEarned',
          (v) => (v as List<dynamic>).map((e) => e as String).toList(),
        ),
        practice: $checkedConvert(
          'practice',
          (v) => v == null
              ? null
              : PracticeProgressDto.fromJson(v as Map<String, dynamic>),
        ),
      );
      return val;
    });

Map<String, dynamic> _$QuizResultDtoToJson(QuizResultDto instance) =>
    <String, dynamic>{
      'correct': instance.correct,
      'explanation': instance.explanation,
      'reveal': instance.reveal?.toJson(),
      'xpAwarded': instance.xpAwarded,
      'dailyCapReached': instance.dailyCapReached,
      'badgesEarned': instance.badgesEarned,
      'practice': instance.practice?.toJson(),
    };
