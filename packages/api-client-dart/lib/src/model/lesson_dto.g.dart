// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lesson_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LessonDtoCWProxy {
  LessonDto id(String id);

  LessonDto trackId(String trackId);

  LessonDto moduleId(String moduleId);

  LessonDto moduleTitle(String moduleTitle);

  LessonDto number(num number);

  LessonDto lessonCount(num lessonCount);

  LessonDto title(String title);

  LessonDto summary(String summary);

  LessonDto body(String body);

  LessonDto language(String language);

  LessonDto video(VideoDto? video);

  LessonDto xp(num xp);

  LessonDto isPremium(bool isPremium);

  LessonDto status(LessonDtoStatusEnum status);

  LessonDto previousLessonId(String? previousLessonId);

  LessonDto nextLessonId(String? nextLessonId);

  LessonDto challenges(List<ChallengeDto> challenges);

  LessonDto quizzes(List<QuizDto> quizzes);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LessonDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LessonDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LessonDto call({
    String id,
    String trackId,
    String moduleId,
    String moduleTitle,
    num number,
    num lessonCount,
    String title,
    String summary,
    String body,
    String language,
    VideoDto? video,
    num xp,
    bool isPremium,
    LessonDtoStatusEnum status,
    String? previousLessonId,
    String? nextLessonId,
    List<ChallengeDto> challenges,
    List<QuizDto> quizzes,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLessonDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLessonDto.copyWith.fieldName(...)`
class _$LessonDtoCWProxyImpl implements _$LessonDtoCWProxy {
  const _$LessonDtoCWProxyImpl(this._value);

  final LessonDto _value;

  @override
  LessonDto id(String id) => this(id: id);

  @override
  LessonDto trackId(String trackId) => this(trackId: trackId);

  @override
  LessonDto moduleId(String moduleId) => this(moduleId: moduleId);

  @override
  LessonDto moduleTitle(String moduleTitle) => this(moduleTitle: moduleTitle);

  @override
  LessonDto number(num number) => this(number: number);

  @override
  LessonDto lessonCount(num lessonCount) => this(lessonCount: lessonCount);

  @override
  LessonDto title(String title) => this(title: title);

  @override
  LessonDto summary(String summary) => this(summary: summary);

  @override
  LessonDto body(String body) => this(body: body);

  @override
  LessonDto language(String language) => this(language: language);

  @override
  LessonDto video(VideoDto? video) => this(video: video);

  @override
  LessonDto xp(num xp) => this(xp: xp);

  @override
  LessonDto isPremium(bool isPremium) => this(isPremium: isPremium);

  @override
  LessonDto status(LessonDtoStatusEnum status) => this(status: status);

  @override
  LessonDto previousLessonId(String? previousLessonId) =>
      this(previousLessonId: previousLessonId);

  @override
  LessonDto nextLessonId(String? nextLessonId) =>
      this(nextLessonId: nextLessonId);

  @override
  LessonDto challenges(List<ChallengeDto> challenges) =>
      this(challenges: challenges);

  @override
  LessonDto quizzes(List<QuizDto> quizzes) => this(quizzes: quizzes);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LessonDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LessonDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LessonDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? trackId = const $CopyWithPlaceholder(),
    Object? moduleId = const $CopyWithPlaceholder(),
    Object? moduleTitle = const $CopyWithPlaceholder(),
    Object? number = const $CopyWithPlaceholder(),
    Object? lessonCount = const $CopyWithPlaceholder(),
    Object? title = const $CopyWithPlaceholder(),
    Object? summary = const $CopyWithPlaceholder(),
    Object? body = const $CopyWithPlaceholder(),
    Object? language = const $CopyWithPlaceholder(),
    Object? video = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? isPremium = const $CopyWithPlaceholder(),
    Object? status = const $CopyWithPlaceholder(),
    Object? previousLessonId = const $CopyWithPlaceholder(),
    Object? nextLessonId = const $CopyWithPlaceholder(),
    Object? challenges = const $CopyWithPlaceholder(),
    Object? quizzes = const $CopyWithPlaceholder(),
  }) {
    return LessonDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      trackId: trackId == const $CopyWithPlaceholder()
          ? _value.trackId
          // ignore: cast_nullable_to_non_nullable
          : trackId as String,
      moduleId: moduleId == const $CopyWithPlaceholder()
          ? _value.moduleId
          // ignore: cast_nullable_to_non_nullable
          : moduleId as String,
      moduleTitle: moduleTitle == const $CopyWithPlaceholder()
          ? _value.moduleTitle
          // ignore: cast_nullable_to_non_nullable
          : moduleTitle as String,
      number: number == const $CopyWithPlaceholder()
          ? _value.number
          // ignore: cast_nullable_to_non_nullable
          : number as num,
      lessonCount: lessonCount == const $CopyWithPlaceholder()
          ? _value.lessonCount
          // ignore: cast_nullable_to_non_nullable
          : lessonCount as num,
      title: title == const $CopyWithPlaceholder()
          ? _value.title
          // ignore: cast_nullable_to_non_nullable
          : title as String,
      summary: summary == const $CopyWithPlaceholder()
          ? _value.summary
          // ignore: cast_nullable_to_non_nullable
          : summary as String,
      body: body == const $CopyWithPlaceholder()
          ? _value.body
          // ignore: cast_nullable_to_non_nullable
          : body as String,
      language: language == const $CopyWithPlaceholder()
          ? _value.language
          // ignore: cast_nullable_to_non_nullable
          : language as String,
      video: video == const $CopyWithPlaceholder()
          ? _value.video
          // ignore: cast_nullable_to_non_nullable
          : video as VideoDto?,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      isPremium: isPremium == const $CopyWithPlaceholder()
          ? _value.isPremium
          // ignore: cast_nullable_to_non_nullable
          : isPremium as bool,
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as LessonDtoStatusEnum,
      previousLessonId: previousLessonId == const $CopyWithPlaceholder()
          ? _value.previousLessonId
          // ignore: cast_nullable_to_non_nullable
          : previousLessonId as String?,
      nextLessonId: nextLessonId == const $CopyWithPlaceholder()
          ? _value.nextLessonId
          // ignore: cast_nullable_to_non_nullable
          : nextLessonId as String?,
      challenges: challenges == const $CopyWithPlaceholder()
          ? _value.challenges
          // ignore: cast_nullable_to_non_nullable
          : challenges as List<ChallengeDto>,
      quizzes: quizzes == const $CopyWithPlaceholder()
          ? _value.quizzes
          // ignore: cast_nullable_to_non_nullable
          : quizzes as List<QuizDto>,
    );
  }
}

extension $LessonDtoCopyWith on LessonDto {
  /// Returns a callable class that can be used as follows: `instanceOfLessonDto.copyWith(...)` or like so:`instanceOfLessonDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LessonDtoCWProxy get copyWith => _$LessonDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LessonDto _$LessonDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LessonDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'trackId',
          'moduleId',
          'moduleTitle',
          'number',
          'lessonCount',
          'title',
          'summary',
          'body',
          'language',
          'video',
          'xp',
          'isPremium',
          'status',
          'previousLessonId',
          'nextLessonId',
          'challenges',
          'quizzes',
        ],
      );
      final val = LessonDto(
        id: $checkedConvert('id', (v) => v as String),
        trackId: $checkedConvert('trackId', (v) => v as String),
        moduleId: $checkedConvert('moduleId', (v) => v as String),
        moduleTitle: $checkedConvert('moduleTitle', (v) => v as String),
        number: $checkedConvert('number', (v) => v as num),
        lessonCount: $checkedConvert('lessonCount', (v) => v as num),
        title: $checkedConvert('title', (v) => v as String),
        summary: $checkedConvert('summary', (v) => v as String),
        body: $checkedConvert('body', (v) => v as String),
        language: $checkedConvert('language', (v) => v as String),
        video: $checkedConvert(
          'video',
          (v) =>
              v == null ? null : VideoDto.fromJson(v as Map<String, dynamic>),
        ),
        xp: $checkedConvert('xp', (v) => v as num),
        isPremium: $checkedConvert('isPremium', (v) => v as bool),
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$LessonDtoStatusEnumEnumMap,
            v,
            unknownValue: LessonDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
        previousLessonId: $checkedConvert(
          'previousLessonId',
          (v) => v as String?,
        ),
        nextLessonId: $checkedConvert('nextLessonId', (v) => v as String?),
        challenges: $checkedConvert(
          'challenges',
          (v) => (v as List<dynamic>)
              .map((e) => ChallengeDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        quizzes: $checkedConvert(
          'quizzes',
          (v) => (v as List<dynamic>)
              .map((e) => QuizDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$LessonDtoToJson(LessonDto instance) => <String, dynamic>{
  'id': instance.id,
  'trackId': instance.trackId,
  'moduleId': instance.moduleId,
  'moduleTitle': instance.moduleTitle,
  'number': instance.number,
  'lessonCount': instance.lessonCount,
  'title': instance.title,
  'summary': instance.summary,
  'body': instance.body,
  'language': instance.language,
  'video': instance.video?.toJson(),
  'xp': instance.xp,
  'isPremium': instance.isPremium,
  'status': _$LessonDtoStatusEnumEnumMap[instance.status]!,
  'previousLessonId': instance.previousLessonId,
  'nextLessonId': instance.nextLessonId,
  'challenges': instance.challenges.map((e) => e.toJson()).toList(),
  'quizzes': instance.quizzes.map((e) => e.toJson()).toList(),
};

const _$LessonDtoStatusEnumEnumMap = {
  LessonDtoStatusEnum.NOT_STARTED: 'NOT_STARTED',
  LessonDtoStatusEnum.STARTED: 'STARTED',
  LessonDtoStatusEnum.COMPLETED: 'COMPLETED',
  LessonDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
