// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_friend_decision_result_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentFriendDecisionResultDtoCWProxy {
  ParentFriendDecisionResultDto status(
    ParentFriendDecisionResultDtoStatusEnum status,
  );

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentFriendDecisionResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentFriendDecisionResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentFriendDecisionResultDto call({
    ParentFriendDecisionResultDtoStatusEnum status,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentFriendDecisionResultDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentFriendDecisionResultDto.copyWith.fieldName(...)`
class _$ParentFriendDecisionResultDtoCWProxyImpl
    implements _$ParentFriendDecisionResultDtoCWProxy {
  const _$ParentFriendDecisionResultDtoCWProxyImpl(this._value);

  final ParentFriendDecisionResultDto _value;

  @override
  ParentFriendDecisionResultDto status(
    ParentFriendDecisionResultDtoStatusEnum status,
  ) => this(status: status);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentFriendDecisionResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentFriendDecisionResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentFriendDecisionResultDto call({
    Object? status = const $CopyWithPlaceholder(),
  }) {
    return ParentFriendDecisionResultDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as ParentFriendDecisionResultDtoStatusEnum,
    );
  }
}

extension $ParentFriendDecisionResultDtoCopyWith
    on ParentFriendDecisionResultDto {
  /// Returns a callable class that can be used as follows: `instanceOfParentFriendDecisionResultDto.copyWith(...)` or like so:`instanceOfParentFriendDecisionResultDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentFriendDecisionResultDtoCWProxy get copyWith =>
      _$ParentFriendDecisionResultDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentFriendDecisionResultDto _$ParentFriendDecisionResultDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ParentFriendDecisionResultDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['status']);
  final val = ParentFriendDecisionResultDto(
    status: $checkedConvert(
      'status',
      (v) => $enumDecode(
        _$ParentFriendDecisionResultDtoStatusEnumEnumMap,
        v,
        unknownValue:
            ParentFriendDecisionResultDtoStatusEnum.unknownDefaultOpenApi,
      ),
    ),
  );
  return val;
});

Map<String, dynamic> _$ParentFriendDecisionResultDtoToJson(
  ParentFriendDecisionResultDto instance,
) => <String, dynamic>{
  'status': _$ParentFriendDecisionResultDtoStatusEnumEnumMap[instance.status]!,
};

const _$ParentFriendDecisionResultDtoStatusEnumEnumMap = {
  ParentFriendDecisionResultDtoStatusEnum.PENDING: 'PENDING',
  ParentFriendDecisionResultDtoStatusEnum.APPROVED: 'APPROVED',
  ParentFriendDecisionResultDtoStatusEnum.DECLINED: 'DECLINED',
  ParentFriendDecisionResultDtoStatusEnum.CANCELLED: 'CANCELLED',
  ParentFriendDecisionResultDtoStatusEnum.EXPIRED: 'EXPIRED',
  ParentFriendDecisionResultDtoStatusEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
