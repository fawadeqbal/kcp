// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'board_week_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$BoardWeekDtoCWProxy {
  BoardWeekDto key(String key);

  BoardWeekDto startDay(String startDay);

  BoardWeekDto endDay(String endDay);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BoardWeekDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BoardWeekDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BoardWeekDto call({String key, String startDay, String endDay});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfBoardWeekDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfBoardWeekDto.copyWith.fieldName(...)`
class _$BoardWeekDtoCWProxyImpl implements _$BoardWeekDtoCWProxy {
  const _$BoardWeekDtoCWProxyImpl(this._value);

  final BoardWeekDto _value;

  @override
  BoardWeekDto key(String key) => this(key: key);

  @override
  BoardWeekDto startDay(String startDay) => this(startDay: startDay);

  @override
  BoardWeekDto endDay(String endDay) => this(endDay: endDay);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BoardWeekDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BoardWeekDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BoardWeekDto call({
    Object? key = const $CopyWithPlaceholder(),
    Object? startDay = const $CopyWithPlaceholder(),
    Object? endDay = const $CopyWithPlaceholder(),
  }) {
    return BoardWeekDto(
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

extension $BoardWeekDtoCopyWith on BoardWeekDto {
  /// Returns a callable class that can be used as follows: `instanceOfBoardWeekDto.copyWith(...)` or like so:`instanceOfBoardWeekDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$BoardWeekDtoCWProxy get copyWith => _$BoardWeekDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

BoardWeekDto _$BoardWeekDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('BoardWeekDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['key', 'startDay', 'endDay']);
      final val = BoardWeekDto(
        key: $checkedConvert('key', (v) => v as String),
        startDay: $checkedConvert('startDay', (v) => v as String),
        endDay: $checkedConvert('endDay', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$BoardWeekDtoToJson(BoardWeekDto instance) =>
    <String, dynamic>{
      'key': instance.key,
      'startDay': instance.startDay,
      'endDay': instance.endDay,
    };
