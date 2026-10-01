// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'report_child_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ReportChildDtoCWProxy {
  ReportChildDto childId(String childId);

  ReportChildDto nickname(String nickname);

  ReportChildDto avatarKey(String avatarKey);

  ReportChildDto minutes(num minutes);

  ReportChildDto xp(num xp);

  ReportChildDto lessons(num lessons);

  ReportChildDto projects(num projects);

  ReportChildDto badges(num badges);

  ReportChildDto streak(num streak);

  ReportChildDto league(String league);

  ReportChildDto skills(List<String> skills);

  ReportChildDto days(List<num> days);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ReportChildDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ReportChildDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ReportChildDto call({
    String childId,
    String nickname,
    String avatarKey,
    num minutes,
    num xp,
    num lessons,
    num projects,
    num badges,
    num streak,
    String league,
    List<String> skills,
    List<num> days,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfReportChildDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfReportChildDto.copyWith.fieldName(...)`
class _$ReportChildDtoCWProxyImpl implements _$ReportChildDtoCWProxy {
  const _$ReportChildDtoCWProxyImpl(this._value);

  final ReportChildDto _value;

  @override
  ReportChildDto childId(String childId) => this(childId: childId);

  @override
  ReportChildDto nickname(String nickname) => this(nickname: nickname);

  @override
  ReportChildDto avatarKey(String avatarKey) => this(avatarKey: avatarKey);

  @override
  ReportChildDto minutes(num minutes) => this(minutes: minutes);

  @override
  ReportChildDto xp(num xp) => this(xp: xp);

  @override
  ReportChildDto lessons(num lessons) => this(lessons: lessons);

  @override
  ReportChildDto projects(num projects) => this(projects: projects);

  @override
  ReportChildDto badges(num badges) => this(badges: badges);

  @override
  ReportChildDto streak(num streak) => this(streak: streak);

  @override
  ReportChildDto league(String league) => this(league: league);

  @override
  ReportChildDto skills(List<String> skills) => this(skills: skills);

  @override
  ReportChildDto days(List<num> days) => this(days: days);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ReportChildDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ReportChildDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ReportChildDto call({
    Object? childId = const $CopyWithPlaceholder(),
    Object? nickname = const $CopyWithPlaceholder(),
    Object? avatarKey = const $CopyWithPlaceholder(),
    Object? minutes = const $CopyWithPlaceholder(),
    Object? xp = const $CopyWithPlaceholder(),
    Object? lessons = const $CopyWithPlaceholder(),
    Object? projects = const $CopyWithPlaceholder(),
    Object? badges = const $CopyWithPlaceholder(),
    Object? streak = const $CopyWithPlaceholder(),
    Object? league = const $CopyWithPlaceholder(),
    Object? skills = const $CopyWithPlaceholder(),
    Object? days = const $CopyWithPlaceholder(),
  }) {
    return ReportChildDto(
      childId: childId == const $CopyWithPlaceholder()
          ? _value.childId
          // ignore: cast_nullable_to_non_nullable
          : childId as String,
      nickname: nickname == const $CopyWithPlaceholder()
          ? _value.nickname
          // ignore: cast_nullable_to_non_nullable
          : nickname as String,
      avatarKey: avatarKey == const $CopyWithPlaceholder()
          ? _value.avatarKey
          // ignore: cast_nullable_to_non_nullable
          : avatarKey as String,
      minutes: minutes == const $CopyWithPlaceholder()
          ? _value.minutes
          // ignore: cast_nullable_to_non_nullable
          : minutes as num,
      xp: xp == const $CopyWithPlaceholder()
          ? _value.xp
          // ignore: cast_nullable_to_non_nullable
          : xp as num,
      lessons: lessons == const $CopyWithPlaceholder()
          ? _value.lessons
          // ignore: cast_nullable_to_non_nullable
          : lessons as num,
      projects: projects == const $CopyWithPlaceholder()
          ? _value.projects
          // ignore: cast_nullable_to_non_nullable
          : projects as num,
      badges: badges == const $CopyWithPlaceholder()
          ? _value.badges
          // ignore: cast_nullable_to_non_nullable
          : badges as num,
      streak: streak == const $CopyWithPlaceholder()
          ? _value.streak
          // ignore: cast_nullable_to_non_nullable
          : streak as num,
      league: league == const $CopyWithPlaceholder()
          ? _value.league
          // ignore: cast_nullable_to_non_nullable
          : league as String,
      skills: skills == const $CopyWithPlaceholder()
          ? _value.skills
          // ignore: cast_nullable_to_non_nullable
          : skills as List<String>,
      days: days == const $CopyWithPlaceholder()
          ? _value.days
          // ignore: cast_nullable_to_non_nullable
          : days as List<num>,
    );
  }
}

extension $ReportChildDtoCopyWith on ReportChildDto {
  /// Returns a callable class that can be used as follows: `instanceOfReportChildDto.copyWith(...)` or like so:`instanceOfReportChildDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ReportChildDtoCWProxy get copyWith => _$ReportChildDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ReportChildDto _$ReportChildDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ReportChildDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'childId',
          'nickname',
          'avatarKey',
          'minutes',
          'xp',
          'lessons',
          'projects',
          'badges',
          'streak',
          'league',
          'skills',
          'days',
        ],
      );
      final val = ReportChildDto(
        childId: $checkedConvert('childId', (v) => v as String),
        nickname: $checkedConvert('nickname', (v) => v as String),
        avatarKey: $checkedConvert('avatarKey', (v) => v as String),
        minutes: $checkedConvert('minutes', (v) => v as num),
        xp: $checkedConvert('xp', (v) => v as num),
        lessons: $checkedConvert('lessons', (v) => v as num),
        projects: $checkedConvert('projects', (v) => v as num),
        badges: $checkedConvert('badges', (v) => v as num),
        streak: $checkedConvert('streak', (v) => v as num),
        league: $checkedConvert('league', (v) => v as String),
        skills: $checkedConvert(
          'skills',
          (v) => (v as List<dynamic>).map((e) => e as String).toList(),
        ),
        days: $checkedConvert(
          'days',
          (v) => (v as List<dynamic>).map((e) => e as num).toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$ReportChildDtoToJson(ReportChildDto instance) =>
    <String, dynamic>{
      'childId': instance.childId,
      'nickname': instance.nickname,
      'avatarKey': instance.avatarKey,
      'minutes': instance.minutes,
      'xp': instance.xp,
      'lessons': instance.lessons,
      'projects': instance.projects,
      'badges': instance.badges,
      'streak': instance.streak,
      'league': instance.league,
      'skills': instance.skills,
      'days': instance.days,
    };
