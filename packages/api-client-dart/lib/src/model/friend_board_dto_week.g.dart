// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friend_board_dto_week.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FriendBoardDtoWeekCWProxy {
  FriendBoardDtoWeek key(String key);

  FriendBoardDtoWeek startDay(String startDay);

  FriendBoardDtoWeek endDay(String endDay);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendBoardDtoWeek(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendBoardDtoWeek(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendBoardDtoWeek call({String key, String startDay, String endDay});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFriendBoardDtoWeek.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFriendBoardDtoWeek.copyWith.fieldName(...)`
class _$FriendBoardDtoWeekCWProxyImpl implements _$FriendBoardDtoWeekCWProxy {
  const _$FriendBoardDtoWeekCWProxyImpl(this._value);

  final FriendBoardDtoWeek _value;

  @override
  FriendBoardDtoWeek key(String key) => this(key: key);

  @override
  FriendBoardDtoWeek startDay(String startDay) => this(startDay: startDay);

  @override
  FriendBoardDtoWeek endDay(String endDay) => this(endDay: endDay);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendBoardDtoWeek(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendBoardDtoWeek(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendBoardDtoWeek call({
    Object? key = const $CopyWithPlaceholder(),
    Object? startDay = const $CopyWithPlaceholder(),
    Object? endDay = const $CopyWithPlaceholder(),
  }) {
    return FriendBoardDtoWeek(
      key: key == const $CopyWithPlaceholder()
          ? _value.key
          // ignore: cast_nullable_to_non_nullable
          : key as String,
      startDay: startDay == const $CopyWithPlaceholder()
          ? _value.startDay
          // ignore: cast_nullable_to_non_nullable
          : startDay as String,
      endDay: endDay == const $CopyWithPlaceholder()
          ? _value.endDay
          // ignore: cast_nullable_to_non_nullable
          : endDay as String,
    );
  }
}

extension $FriendBoardDtoWeekCopyWith on FriendBoardDtoWeek {
  /// Returns a callable class that can be used as follows: `instanceOfFriendBoardDtoWeek.copyWith(...)` or like so:`instanceOfFriendBoardDtoWeek.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FriendBoardDtoWeekCWProxy get copyWith =>
      _$FriendBoardDtoWeekCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FriendBoardDtoWeek _$FriendBoardDtoWeekFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FriendBoardDtoWeek', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['key', 'startDay', 'endDay']);
      final val = FriendBoardDtoWeek(
        key: $checkedConvert('key', (v) => v as String),
        startDay: $checkedConvert('startDay', (v) => v as String),
        endDay: $checkedConvert('endDay', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$FriendBoardDtoWeekToJson(FriendBoardDtoWeek instance) =>
    <String, dynamic>{
      'key': instance.key,
      'startDay': instance.startDay,
      'endDay': instance.endDay,
    };
