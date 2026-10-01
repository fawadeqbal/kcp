// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'friend_decision_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$FriendDecisionDtoCWProxy {
  FriendDecisionDto approve(bool approve);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendDecisionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendDecisionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendDecisionDto call({bool approve});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfFriendDecisionDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfFriendDecisionDto.copyWith.fieldName(...)`
class _$FriendDecisionDtoCWProxyImpl implements _$FriendDecisionDtoCWProxy {
  const _$FriendDecisionDtoCWProxyImpl(this._value);

  final FriendDecisionDto _value;

  @override
  FriendDecisionDto approve(bool approve) => this(approve: approve);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `FriendDecisionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// FriendDecisionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  FriendDecisionDto call({Object? approve = const $CopyWithPlaceholder()}) {
    return FriendDecisionDto(
      approve: approve == const $CopyWithPlaceholder()
          ? _value.approve
          // ignore: cast_nullable_to_non_nullable
          : approve as bool,
    );
  }
}

extension $FriendDecisionDtoCopyWith on FriendDecisionDto {
  /// Returns a callable class that can be used as follows: `instanceOfFriendDecisionDto.copyWith(...)` or like so:`instanceOfFriendDecisionDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$FriendDecisionDtoCWProxy get copyWith =>
      _$FriendDecisionDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FriendDecisionDto _$FriendDecisionDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('FriendDecisionDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['approve']);
      final val = FriendDecisionDto(
        approve: $checkedConvert('approve', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$FriendDecisionDtoToJson(FriendDecisionDto instance) =>
    <String, dynamic>{'approve': instance.approve};
