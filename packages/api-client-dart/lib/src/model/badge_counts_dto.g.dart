// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'badge_counts_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$BadgeCountsDtoCWProxy {
  BadgeCountsDto earned(num earned);

  BadgeCountsDto total(num total);

  BadgeCountsDto unseen(num unseen);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BadgeCountsDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BadgeCountsDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BadgeCountsDto call({num earned, num total, num unseen});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfBadgeCountsDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfBadgeCountsDto.copyWith.fieldName(...)`
class _$BadgeCountsDtoCWProxyImpl implements _$BadgeCountsDtoCWProxy {
  const _$BadgeCountsDtoCWProxyImpl(this._value);

  final BadgeCountsDto _value;

  @override
  BadgeCountsDto earned(num earned) => this(earned: earned);

  @override
  BadgeCountsDto total(num total) => this(total: total);

  @override
  BadgeCountsDto unseen(num unseen) => this(unseen: unseen);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BadgeCountsDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BadgeCountsDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BadgeCountsDto call({
    Object? earned = const $CopyWithPlaceholder(),
    Object? total = const $CopyWithPlaceholder(),
    Object? unseen = const $CopyWithPlaceholder(),
  }) {
    return BadgeCountsDto(
      earned: earned == const $CopyWithPlaceholder()
          ? _value.earned
          // ignore: cast_nullable_to_non_nullable
          : earned as num,
      total: total == const $CopyWithPlaceholder()
          ? _value.total
          // ignore: cast_nullable_to_non_nullable
          : total as num,
      unseen: unseen == const $CopyWithPlaceholder()
          ? _value.unseen
          // ignore: cast_nullable_to_non_nullable
          : unseen as num,
    );
  }
}

extension $BadgeCountsDtoCopyWith on BadgeCountsDto {
  /// Returns a callable class that can be used as follows: `instanceOfBadgeCountsDto.copyWith(...)` or like so:`instanceOfBadgeCountsDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$BadgeCountsDtoCWProxy get copyWith => _$BadgeCountsDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

BadgeCountsDto _$BadgeCountsDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('BadgeCountsDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['earned', 'total', 'unseen']);
      final val = BadgeCountsDto(
        earned: $checkedConvert('earned', (v) => v as num),
        total: $checkedConvert('total', (v) => v as num),
        unseen: $checkedConvert('unseen', (v) => v as num),
      );
      return val;
    });

Map<String, dynamic> _$BadgeCountsDtoToJson(BadgeCountsDto instance) =>
    <String, dynamic>{
      'earned': instance.earned,
      'total': instance.total,
      'unseen': instance.unseen,
    };
