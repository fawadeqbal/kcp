// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'badges_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$BadgesDtoCWProxy {
  BadgesDto badges(List<BadgeDto> badges);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BadgesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BadgesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BadgesDto call({List<BadgeDto> badges});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfBadgesDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfBadgesDto.copyWith.fieldName(...)`
class _$BadgesDtoCWProxyImpl implements _$BadgesDtoCWProxy {
  const _$BadgesDtoCWProxyImpl(this._value);

  final BadgesDto _value;

  @override
  BadgesDto badges(List<BadgeDto> badges) => this(badges: badges);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BadgesDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BadgesDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BadgesDto call({Object? badges = const $CopyWithPlaceholder()}) {
    return BadgesDto(
      badges: badges == const $CopyWithPlaceholder()
          ? _value.badges
          // ignore: cast_nullable_to_non_nullable
          : badges as List<BadgeDto>,
    );
  }
}

extension $BadgesDtoCopyWith on BadgesDto {
  /// Returns a callable class that can be used as follows: `instanceOfBadgesDto.copyWith(...)` or like so:`instanceOfBadgesDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$BadgesDtoCWProxy get copyWith => _$BadgesDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

BadgesDto _$BadgesDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('BadgesDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['badges']);
      final val = BadgesDto(
        badges: $checkedConvert(
          'badges',
          (v) => (v as List<dynamic>)
              .map((e) => BadgeDto.fromJson(e as Map<String, dynamic>))
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$BadgesDtoToJson(BadgesDto instance) => <String, dynamic>{
  'badges': instance.badges.map((e) => e.toJson()).toList(),
};
