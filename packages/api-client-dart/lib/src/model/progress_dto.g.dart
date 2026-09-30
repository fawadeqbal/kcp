// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'progress_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ProgressDtoCWProxy {
  ProgressDto xpTotal(num xpTotal);

  ProgressDto level(LevelDto level);

  ProgressDto today(TodayDto today);

  ProgressDto streak(StreakDto streak);

  ProgressDto week(WeekDto week);

  ProgressDto season(SeasonDto? season);

  ProgressDto badges(BadgeCountsDto badges);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ProgressDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ProgressDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ProgressDto call({
    num xpTotal,
    LevelDto level,
    TodayDto today,
    StreakDto streak,
    WeekDto week,
    SeasonDto? season,
    BadgeCountsDto badges,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfProgressDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfProgressDto.copyWith.fieldName(...)`
class _$ProgressDtoCWProxyImpl implements _$ProgressDtoCWProxy {
  const _$ProgressDtoCWProxyImpl(this._value);

  final ProgressDto _value;

  @override
  ProgressDto xpTotal(num xpTotal) => this(xpTotal: xpTotal);

  @override
  ProgressDto level(LevelDto level) => this(level: level);

  @override
  ProgressDto today(TodayDto today) => this(today: today);

  @override
  ProgressDto streak(StreakDto streak) => this(streak: streak);

  @override
  ProgressDto week(WeekDto week) => this(week: week);

  @override
  ProgressDto season(SeasonDto? season) => this(season: season);

  @override
  ProgressDto badges(BadgeCountsDto badges) => this(badges: badges);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ProgressDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ProgressDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ProgressDto call({
    Object? xpTotal = const $CopyWithPlaceholder(),
    Object? level = const $CopyWithPlaceholder(),
    Object? today = const $CopyWithPlaceholder(),
    Object? streak = const $CopyWithPlaceholder(),
    Object? week = const $CopyWithPlaceholder(),
    Object? season = const $CopyWithPlaceholder(),
    Object? badges = const $CopyWithPlaceholder(),
  }) {
    return ProgressDto(
      xpTotal: xpTotal == const $CopyWithPlaceholder()
          ? _value.xpTotal
          // ignore: cast_nullable_to_non_nullable
          : xpTotal as num,
      level: level == const $CopyWithPlaceholder()
          ? _value.level
          // ignore: cast_nullable_to_non_nullable
          : level as LevelDto,
      today: today == const $CopyWithPlaceholder()
          ? _value.today
          // ignore: cast_nullable_to_non_nullable
          : today as TodayDto,
      streak: streak == const $CopyWithPlaceholder()
          ? _value.streak
          // ignore: cast_nullable_to_non_nullable
          : streak as StreakDto,
      week: week == const $CopyWithPlaceholder()
          ? _value.week
          // ignore: cast_nullable_to_non_nullable
          : week as WeekDto,
      season: season == const $CopyWithPlaceholder()
          ? _value.season
          // ignore: cast_nullable_to_non_nullable
          : season as SeasonDto?,
      badges: badges == const $CopyWithPlaceholder()
          ? _value.badges
          // ignore: cast_nullable_to_non_nullable
          : badges as BadgeCountsDto,
    );
  }
}

extension $ProgressDtoCopyWith on ProgressDto {
  /// Returns a callable class that can be used as follows: `instanceOfProgressDto.copyWith(...)` or like so:`instanceOfProgressDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ProgressDtoCWProxy get copyWith => _$ProgressDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ProgressDto _$ProgressDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ProgressDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'xpTotal',
          'level',
          'today',
          'streak',
          'week',
          'season',
          'badges',
        ],
      );
      final val = ProgressDto(
        xpTotal: $checkedConvert('xpTotal', (v) => v as num),
        level: $checkedConvert(
          'level',
          (v) => LevelDto.fromJson(v as Map<String, dynamic>),
        ),
        today: $checkedConvert(
          'today',
          (v) => TodayDto.fromJson(v as Map<String, dynamic>),
        ),
        streak: $checkedConvert(
          'streak',
          (v) => StreakDto.fromJson(v as Map<String, dynamic>),
        ),
        week: $checkedConvert(
          'week',
          (v) => WeekDto.fromJson(v as Map<String, dynamic>),
        ),
        season: $checkedConvert(
          'season',
          (v) =>
              v == null ? null : SeasonDto.fromJson(v as Map<String, dynamic>),
        ),
        badges: $checkedConvert(
          'badges',
          (v) => BadgeCountsDto.fromJson(v as Map<String, dynamic>),
        ),
      );
      return val;
    });

Map<String, dynamic> _$ProgressDtoToJson(ProgressDto instance) =>
    <String, dynamic>{
      'xpTotal': instance.xpTotal,
      'level': instance.level.toJson(),
      'today': instance.today.toJson(),
      'streak': instance.streak.toJson(),
      'week': instance.week.toJson(),
      'season': instance.season?.toJson(),
      'badges': instance.badges.toJson(),
    };
