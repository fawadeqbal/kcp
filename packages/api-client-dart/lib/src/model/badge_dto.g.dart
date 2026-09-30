// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'badge_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$BadgeDtoCWProxy {
  BadgeDto key(String key);

  BadgeDto category(String category);

  BadgeDto icon(String icon);

  BadgeDto earned(bool earned);

  BadgeDto awardedAt(DateTime? awardedAt);

  BadgeDto seen(bool seen);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BadgeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BadgeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BadgeDto call({
    String key,
    String category,
    String icon,
    bool earned,
    DateTime? awardedAt,
    bool seen,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfBadgeDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfBadgeDto.copyWith.fieldName(...)`
class _$BadgeDtoCWProxyImpl implements _$BadgeDtoCWProxy {
  const _$BadgeDtoCWProxyImpl(this._value);

  final BadgeDto _value;

  @override
  BadgeDto key(String key) => this(key: key);

  @override
  BadgeDto category(String category) => this(category: category);

  @override
  BadgeDto icon(String icon) => this(icon: icon);

  @override
  BadgeDto earned(bool earned) => this(earned: earned);

  @override
  BadgeDto awardedAt(DateTime? awardedAt) => this(awardedAt: awardedAt);

  @override
  BadgeDto seen(bool seen) => this(seen: seen);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BadgeDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BadgeDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BadgeDto call({
    Object? key = const $CopyWithPlaceholder(),
    Object? category = const $CopyWithPlaceholder(),
    Object? icon = const $CopyWithPlaceholder(),
    Object? earned = const $CopyWithPlaceholder(),
    Object? awardedAt = const $CopyWithPlaceholder(),
    Object? seen = const $CopyWithPlaceholder(),
  }) {
    return BadgeDto(
      key: key == const $CopyWithPlaceholder()
          ? _value.key
          // ignore: cast_nullable_to_non_nullable
          : key as String,
      category: category == const $CopyWithPlaceholder()
          ? _value.category
          // ignore: cast_nullable_to_non_nullable
          : category as String,
      icon: icon == const $CopyWithPlaceholder()
          ? _value.icon
          // ignore: cast_nullable_to_non_nullable
          : icon as String,
      earned: earned == const $CopyWithPlaceholder()
          ? _value.earned
          // ignore: cast_nullable_to_non_nullable
          : earned as bool,
      awardedAt: awardedAt == const $CopyWithPlaceholder()
          ? _value.awardedAt
          // ignore: cast_nullable_to_non_nullable
          : awardedAt as DateTime?,
      seen: seen == const $CopyWithPlaceholder()
          ? _value.seen
          // ignore: cast_nullable_to_non_nullable
          : seen as bool,
    );
  }
}

extension $BadgeDtoCopyWith on BadgeDto {
  /// Returns a callable class that can be used as follows: `instanceOfBadgeDto.copyWith(...)` or like so:`instanceOfBadgeDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$BadgeDtoCWProxy get copyWith => _$BadgeDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

BadgeDto _$BadgeDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('BadgeDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'key',
          'category',
          'icon',
          'earned',
          'awardedAt',
          'seen',
        ],
      );
      final val = BadgeDto(
        key: $checkedConvert('key', (v) => v as String),
        category: $checkedConvert('category', (v) => v as String),
        icon: $checkedConvert('icon', (v) => v as String),
        earned: $checkedConvert('earned', (v) => v as bool),
        awardedAt: $checkedConvert(
          'awardedAt',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
        seen: $checkedConvert('seen', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$BadgeDtoToJson(BadgeDto instance) => <String, dynamic>{
  'key': instance.key,
  'category': instance.category,
  'icon': instance.icon,
  'earned': instance.earned,
  'awardedAt': instance.awardedAt?.toIso8601String(),
  'seen': instance.seen,
};
