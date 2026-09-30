// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lesson_summary_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LessonSummaryDtoCWProxy {
  LessonSummaryDto id(String id);

  LessonSummaryDto title(String title);

  LessonSummaryDto summary(String summary);

  LessonSummaryDto xp(num xp);

  LessonSummaryDto isPremium(bool isPremium);

  LessonSummaryDto locked(bool locked);

  LessonSummaryDto challengeCount(num challengeCount);

  LessonSummaryDto quizCount(num quizCount);

  LessonSummaryDto status(LessonSummaryDtoStatusEnum status);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LessonSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LessonSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LessonSummaryDto call({
    String id,
    String title,
    String summary,
    num xp,
    bool isPremium,
    bool locked,
    num challengeCount,
    num quizCount,
    LessonSummaryDtoStatusEnum status,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLessonSummaryDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLessonSummaryDto.copyWith.fieldName(...)`
class _$LessonSummaryDtoCWProxyImpl implements _$LessonSummaryDtoCWProxy {
  const _$LessonSummaryDtoCWProxyImpl(this._value);

  final LessonSummaryDto _value;

  @override
  LessonSummaryDto id(String id) => this(id: id);

  @override
  LessonSummaryDto title(String title) => this(title: title);

  @override
  LessonSummaryDto summary(String summary) => this(summary: summary);

  @override
  LessonSummaryDto xp(num xp) => this(xp: xp);

  @override
  LessonSummaryDto isPremium(bool isPremium) => this(isPremium: isPremium);

  @override
  LessonSummaryDto locked(bool locked) => this(locked: locked);

  @override
  LessonSummaryDto challengeCount(num challengeCount) =>
      this(challengeCount: challengeCount);

  @override
  LessonSummaryDto quizCount(num quizCount) => this(quizCount: quizCount);

  @override
  LessonSummaryDto status(LessonSummaryDtoStatusEnum status) =>
      this(status: status);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LessonSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LessonSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LessonSummaryDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? title = const $CopyWithPlaceholder(),
    Object? summary = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? isPremium = const $CopyWithPlaceholder(),
    Object? locked = const $CopyWithPlaceholder(),
    Object? challengeCount = const $CopyWithPlaceholder(),
    Object? quizCount = const $CopyWithPlaceholder(),
    Object? status = const $CopyWithPlaceholder(),
  }) {
    return LessonSummaryDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      title: title == const $CopyWithPlaceholder()
          ? _value.title
          // ignore: cast_nullable_to_non_nullable
          : title as String,
      summary: summary == const $CopyWithPlaceholder()
          ? _value.summary
          // ignore: cast_nullable_to_non_nullable
          : summary as String,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      isPremium: isPremium == const $CopyWithPlaceholder()
          ? _value.isPremium
          // ignore: cast_nullable_to_non_nullable
          : isPremium as bool,
      locked: locked == const $CopyWithPlaceholder()
          ? _value.locked
          // ignore: cast_nullable_to_non_nullable
          : locked as bool,
      challengeCount: challengeCount == const $CopyWithPlaceholder()
          ? _value.challengeCount
          // ignore: cast_nullable_to_non_nullable
          : challengeCount as num,
      quizCount: quizCount == const $CopyWithPlaceholder()
          ? _value.quizCount
          // ignore: cast_nullable_to_non_nullable
          : quizCount as num,
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as LessonSummaryDtoStatusEnum,
    );
  }
}

extension $LessonSummaryDtoCopyWith on LessonSummaryDto {
  /// Returns a callable class that can be used as follows: `instanceOfLessonSummaryDto.copyWith(...)` or like so:`instanceOfLessonSummaryDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LessonSummaryDtoCWProxy get copyWith => _$LessonSummaryDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LessonSummaryDto _$LessonSummaryDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LessonSummaryDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'title',
          'summary',
          'xp',
          'isPremium',
          'locked',
          'challengeCount',
          'quizCount',
          'status',
        ],
      );
      final val = LessonSummaryDto(
        id: $checkedConvert('id', (v) => v as String),
        title: $checkedConvert('title', (v) => v as String),
        summary: $checkedConvert('summary', (v) => v as String),
        xp: $checkedConvert('xp', (v) => v as num),
        isPremium: $checkedConvert('isPremium', (v) => v as bool),
        locked: $checkedConvert('locked', (v) => v as bool),
        challengeCount: $checkedConvert('challengeCount', (v) => v as num),
        quizCount: $checkedConvert('quizCount', (v) => v as num),
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$LessonSummaryDtoStatusEnumEnumMap,
            v,
            unknownValue: LessonSummaryDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$LessonSummaryDtoToJson(LessonSummaryDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'summary': instance.summary,
      'xp': instance.xp,
      'isPremium': instance.isPremium,
      'locked': instance.locked,
      'challengeCount': instance.challengeCount,
      'quizCount': instance.quizCount,
      'status': _$LessonSummaryDtoStatusEnumEnumMap[instance.status]!,
    };

const _$LessonSummaryDtoStatusEnumEnumMap = {
  LessonSummaryDtoStatusEnum.NOT_STARTED: 'NOT_STARTED',
  LessonSummaryDtoStatusEnum.STARTED: 'STARTED',
  LessonSummaryDtoStatusEnum.COMPLETED: 'COMPLETED',
  LessonSummaryDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
