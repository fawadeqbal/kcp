// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'learning_overview_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$LearningOverviewDtoCWProxy {
  LearningOverviewDto tracks(List<TrackDto> tracks);

  LearningOverviewDto nextLessonId(String? nextLessonId);

  LearningOverviewDto lessonsCompleted(num lessonsCompleted);

  LearningOverviewDto premium(PremiumInfoDto? premium);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LearningOverviewDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LearningOverviewDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LearningOverviewDto call({
    List<TrackDto> tracks,
    String? nextLessonId,
    num lessonsCompleted,
    PremiumInfoDto? premium,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfLearningOverviewDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfLearningOverviewDto.copyWith.fieldName(...)`
class _$LearningOverviewDtoCWProxyImpl implements _$LearningOverviewDtoCWProxy {
  const _$LearningOverviewDtoCWProxyImpl(this._value);

  final LearningOverviewDto _value;

  @override
  LearningOverviewDto tracks(List<TrackDto> tracks) => this(tracks: tracks);

  @override
  LearningOverviewDto nextLessonId(String? nextLessonId) =>
      this(nextLessonId: nextLessonId);

  @override
  LearningOverviewDto lessonsCompleted(num lessonsCompleted) =>
      this(lessonsCompleted: lessonsCompleted);

  @override
  LearningOverviewDto premium(PremiumInfoDto? premium) =>
      this(premium: premium);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `LearningOverviewDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// LearningOverviewDto(...).copyWith(id: 12, name: "My name")
  /// ````
  LearningOverviewDto call({
    Object? tracks = const $CopyWithPlaceholder(),
    Object? nextLessonId = const $CopyWithPlaceholder(),
    Object? lessonsCompleted = const $CopyWithPlaceholder(),
    Object? premium = const $CopyWithPlaceholder(),
  }) {
    return LearningOverviewDto(
      tracks: tracks == const $CopyWithPlaceholder()
          ? _value.tracks
          // ignore: cast_nullable_to_non_nullable
          : tracks as List<TrackDto>,
      nextLessonId: nextLessonId == const $CopyWithPlaceholder()
          ? _value.nextLessonId
          // ignore: cast_nullable_to_non_nullable
          : nextLessonId as String?,
      lessonsCompleted: lessonsCompleted == const $CopyWithPlaceholder()
          ? _value.lessonsCompleted
          // ignore: cast_nullable_to_non_nullable
          : lessonsCompleted as num,
      premium: premium == const $CopyWithPlaceholder()
          ? _value.premium
          // ignore: cast_nullable_to_non_nullable
          : premium as PremiumInfoDto?,
    );
  }
}

extension $LearningOverviewDtoCopyWith on LearningOverviewDto {
  /// Returns a callable class that can be used as follows: `instanceOfLearningOverviewDto.copyWith(...)` or like so:`instanceOfLearningOverviewDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$LearningOverviewDtoCWProxy get copyWith =>
      _$LearningOverviewDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LearningOverviewDto _$LearningOverviewDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('LearningOverviewDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'tracks',
          'nextLessonId',
          'lessonsCompleted',
          'premium',
        ],
      );
      final val = LearningOverviewDto(
        tracks: $checkedConvert(
          'tracks',
          (v) => (v as List<dynamic>)
              .map((e) => TrackDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
        nextLessonId: $checkedConvert('nextLessonId', (v) => v as String?),
        lessonsCompleted: $checkedConvert('lessonsCompleted', (v) => v as num),
        premium: $checkedConvert(
          'premium',
          (v) => v == null
              ? null
              : PremiumInfoDto.fromJson(v as Map<String, dynamic>),
        ),
      );
      return val;
    });

Map<String, dynamic> _$LearningOverviewDtoToJson(
  LearningOverviewDto instance,
) => <String, dynamic>{
  'tracks': instance.tracks.map((e) => e.toJson()).toList(),
  'nextLessonId': instance.nextLessonId,
  'lessonsCompleted': instance.lessonsCompleted,
  'premium': instance.premium?.toJson(),
};
