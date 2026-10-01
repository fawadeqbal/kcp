// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friend_board_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FriendBoardDtoCWProxy {
  FriendBoardDto week(FriendBoardDtoWeek week);

  FriendBoardDto entries(List<FriendBoardEntryDto> entries);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendBoardDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendBoardDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendBoardDto call({
    FriendBoardDtoWeek week,
    List<FriendBoardEntryDto> entries,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFriendBoardDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFriendBoardDto.copyWith.fieldName(...)`
class _$FriendBoardDtoCWProxyImpl implements _$FriendBoardDtoCWProxy {
  const _$FriendBoardDtoCWProxyImpl(this._value);

  final FriendBoardDto _value;

  @override
  FriendBoardDto week(FriendBoardDtoWeek week) => this(week: week);

  @override
  FriendBoardDto entries(List<FriendBoardEntryDto> entries) =>
      this(entries: entries);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendBoardDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendBoardDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendBoardDto call({
    Object? week = const $CopyWithPlaceholder(),
    Object? entries = const $CopyWithPlaceholder(),
  }) {
    return FriendBoardDto(
      week: week == const $CopyWithPlaceholder()
          ? _value.week
          // ignore: cast_nullable_to_non_nullable
          : week as FriendBoardDtoWeek,
      entries: entries == const $CopyWithPlaceholder()
          ? _value.entries
          // ignore: cast_nullable_to_non_nullable
          : entries as List<FriendBoardEntryDto>,
    );
  }
}

extension $FriendBoardDtoCopyWith on FriendBoardDto {
  /// Returns a callable class that can be used as follows: `instanceOfFriendBoardDto.copyWith(...)` or like so:`instanceOfFriendBoardDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FriendBoardDtoCWProxy get copyWith => _$FriendBoardDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FriendBoardDto _$FriendBoardDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FriendBoardDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['week', 'entries']);
      final val = FriendBoardDto(
        week: $checkedConvert(
          'week',
          (v) => FriendBoardDtoWeek.fromJson(v as Map<String, dynamic>),
        ),
        entries: $checkedConvert(
          'entries',
          (v) => (v as List<dynamic>)
              .map(
                (e) => FriendBoardEntryDto.fromJson(e as Map<String, dynamic>),
              )
              .toList(),
        ),
      );
      return val;
    });

Map<String, dynamic> _$FriendBoardDtoToJson(FriendBoardDto instance) =>
    <String, dynamic>{
      'week': instance.week.toJson(),
      'entries': instance.entries.map((e) => e.toJson()).toList(),
    };
