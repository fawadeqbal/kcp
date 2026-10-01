// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_friend_request_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentFriendRequestDtoCWProxy {
  ParentFriendRequestDto direction(
    ParentFriendRequestDtoDirectionEnum direction,
  );

  ParentFriendRequestDto id(String id);

  ParentFriendRequestDto child(FriendChildDto child);

  ParentFriendRequestDto other(FriendOtherDto other);

  ParentFriendRequestDto waitingForYou(bool waitingForYou);

  ParentFriendRequestDto waitingForOtherFamily(bool waitingForOtherFamily);

  ParentFriendRequestDto createdAt(DateTime createdAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentFriendRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentFriendRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentFriendRequestDto call({
    ParentFriendRequestDtoDirectionEnum direction,
    String id,
    FriendChildDto child,
    FriendOtherDto other,
    bool waitingForYou,
    bool waitingForOtherFamily,
    DateTime createdAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentFriendRequestDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentFriendRequestDto.copyWith.fieldName(...)`
class _$ParentFriendRequestDtoCWProxyImpl
    implements _$ParentFriendRequestDtoCWProxy {
  const _$ParentFriendRequestDtoCWProxyImpl(this._value);

  final ParentFriendRequestDto _value;

  @override
  ParentFriendRequestDto direction(
    ParentFriendRequestDtoDirectionEnum direction,
  ) => this(direction: direction);

  @override
  ParentFriendRequestDto id(String id) => this(id: id);

  @override
  ParentFriendRequestDto child(FriendChildDto child) => this(child: child);

  @override
  ParentFriendRequestDto other(FriendOtherDto other) => this(other: other);

  @override
  ParentFriendRequestDto waitingForYou(bool waitingForYou) =>
      this(waitingForYou: waitingForYou);

  @override
  ParentFriendRequestDto waitingForOtherFamily(bool waitingForOtherFamily) =>
      this(waitingForOtherFamily: waitingForOtherFamily);

  @override
  ParentFriendRequestDto createdAt(DateTime createdAt) =>
      this(createdAt: createdAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentFriendRequestDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentFriendRequestDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentFriendRequestDto call({
    Object? direction = const $CopyWithPlaceholder(),
    Object? id = const $CopyWithPlaceholder(),
    Object? child = const $CopyWithPlaceholder(),
    Object? other = const $CopyWithPlaceholder(),
    Object? waitingForYou = const $CopyWithPlaceholder(),
    Object? waitingForOtherFamily = const $CopyWithPlaceholder(),
    Object? createdAt = const $CopyWithPlaceholder(),
  }) {
    return ParentFriendRequestDto(
      direction: direction == const $CopyWithPlaceholder()
          ? _value.direction
          // ignore: cast_nullable_to_non_nullable
          : direction as ParentFriendRequestDtoDirectionEnum,
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      child: child == const $CopyWithPlaceholder()
          ? _value.child
          // ignore: cast_nullable_to_non_nullable
          : child as FriendChildDto,
      other: other == const $CopyWithPlaceholder()
          ? _value.other
          // ignore: cast_nullable_to_non_nullable
          : other as FriendOtherDto,
      waitingForYou: waitingForYou == const $CopyWithPlaceholder()
          ? _value.waitingForYou
          // ignore: cast_nullable_to_non_nullable
          : waitingForYou as bool,
      waitingForOtherFamily:
          waitingForOtherFamily == const $CopyWithPlaceholder()
          ? _value.waitingForOtherFamily
          // ignore: cast_nullable_to_non_nullable
          : waitingForOtherFamily as bool,
      createdAt: createdAt == const $CopyWithPlaceholder()
          ? _value.createdAt
          // ignore: cast_nullable_to_non_nullable
          : createdAt as DateTime,
    );
  }
}

extension $ParentFriendRequestDtoCopyWith on ParentFriendRequestDto {
  /// Returns a callable class that can be used as follows: `instanceOfParentFriendRequestDto.copyWith(...)` or like so:`instanceOfParentFriendRequestDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentFriendRequestDtoCWProxy get copyWith =>
      _$ParentFriendRequestDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentFriendRequestDto _$ParentFriendRequestDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ParentFriendRequestDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'direction',
      'id',
      'child',
      'other',
      'waitingForYou',
      'waitingForOtherFamily',
      'createdAt',
    ],
  );
  final val = ParentFriendRequestDto(
    direction: $checkedConvert(
      'direction',
      (v) => $enumDecode(
        _$ParentFriendRequestDtoDirectionEnumEnumMap,
        v,
        unknownValue: ParentFriendRequestDtoDirectionEnum.unknownDefaultOpenApi,
      ),
    ),
    id: $checkedConvert('id', (v) => v as String),
    child: $checkedConvert(
      'child',
      (v) => FriendChildDto.fromJson(v as Map<String, dynamic>),
    ),
    other: $checkedConvert(
      'other',
      (v) => FriendOtherDto.fromJson(v as Map<String, dynamic>),
    ),
    waitingForYou: $checkedConvert('waitingForYou', (v) => v as bool),
    waitingForOtherFamily: $checkedConvert(
      'waitingForOtherFamily',
      (v) => v as bool,
    ),
    createdAt: $checkedConvert('createdAt', (v) => DateTime.parse(v as String)),
  );
  return val;
});

Map<String, dynamic> _$ParentFriendRequestDtoToJson(
  ParentFriendRequestDto instance,
) => <String, dynamic>{
  'direction':
      _$ParentFriendRequestDtoDirectionEnumEnumMap[instance.direction]!,
  'id': instance.id,
  'child': instance.child.toJson(),
  'other': instance.other.toJson(),
  'waitingForYou': instance.waitingForYou,
  'waitingForOtherFamily': instance.waitingForOtherFamily,
  'createdAt': instance.createdAt.toIso8601String(),
};

const _$ParentFriendRequestDtoDirectionEnumEnumMap = {
  ParentFriendRequestDtoDirectionEnum.sent: 'sent',
  ParentFriendRequestDtoDirectionEnum.received: 'received',
  ParentFriendRequestDtoDirectionEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
