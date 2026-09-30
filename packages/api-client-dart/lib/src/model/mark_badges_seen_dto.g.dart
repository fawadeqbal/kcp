// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mark_badges_seen_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$MarkBadgesSeenDtoCWProxy {
  MarkBadgesSeenDto keys(List<String> keys);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `MarkBadgesSeenDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// MarkBadgesSeenDto(...).copyWith(id: 12, name: "My name")
  /// ````
  MarkBadgesSeenDto call({List<String> keys});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfMarkBadgesSeenDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfMarkBadgesSeenDto.copyWith.fieldName(...)`
class _$MarkBadgesSeenDtoCWProxyImpl implements _$MarkBadgesSeenDtoCWProxy {
  const _$MarkBadgesSeenDtoCWProxyImpl(this._value);

  final MarkBadgesSeenDto _value;

  @override
  MarkBadgesSeenDto keys(List<String> keys) => this(keys: keys);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `MarkBadgesSeenDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// MarkBadgesSeenDto(...).copyWith(id: 12, name: "My name")
  /// ````
  MarkBadgesSeenDto call({Object? keys = const $CopyWithPlaceholder()}) {
    return MarkBadgesSeenDto(
      keys: keys == const $CopyWithPlaceholder()
          ? _value.keys
          // ignore: cast_nullable_to_non_nullable
          : keys as List<String>,
    );
  }
}

extension $MarkBadgesSeenDtoCopyWith on MarkBadgesSeenDto {
  /// Returns a callable class that can be used as follows: `instanceOfMarkBadgesSeenDto.copyWith(...)` or like so:`instanceOfMarkBadgesSeenDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$MarkBadgesSeenDtoCWProxy get copyWith =>
      _$MarkBadgesSeenDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MarkBadgesSeenDto _$MarkBadgesSeenDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('MarkBadgesSeenDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['keys']);
      final val = MarkBadgesSeenDto(
        keys: $checkedConvert(
          'keys',
          (v) => (v as List<dynamic>).map((e) => e as String).toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$MarkBadgesSeenDtoToJson(MarkBadgesSeenDto instance) =>
    <String, dynamic>{'keys': instance.keys};
