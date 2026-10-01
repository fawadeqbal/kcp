// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_decision_result_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$EventDecisionResultDtoCWProxy {
  EventDecisionResultDto status(EventDecisionResultDtoStatusEnum status);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EventDecisionResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EventDecisionResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EventDecisionResultDto call({EventDecisionResultDtoStatusEnum status});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfEventDecisionResultDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfEventDecisionResultDto.copyWith.fieldName(...)`
class _$EventDecisionResultDtoCWProxyImpl
    implements _$EventDecisionResultDtoCWProxy {
  const _$EventDecisionResultDtoCWProxyImpl(this._value);

  final EventDecisionResultDto _value;

  @override
  EventDecisionResultDto status(EventDecisionResultDtoStatusEnum status) =>
      this(status: status);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EventDecisionResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EventDecisionResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EventDecisionResultDto call({Object? status = const $CopyWithPlaceholder()}) {
    return EventDecisionResultDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as EventDecisionResultDtoStatusEnum,
    );
  }
}

extension $EventDecisionResultDtoCopyWith on EventDecisionResultDto {
  /// Returns a callable class that can be used as follows: `instanceOfEventDecisionResultDto.copyWith(...)` or like so:`instanceOfEventDecisionResultDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$EventDecisionResultDtoCWProxy get copyWith =>
      _$EventDecisionResultDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

EventDecisionResultDto _$EventDecisionResultDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('EventDecisionResultDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['status']);
  final val = EventDecisionResultDto(
    status: $checkedConvert(
      'status',
      (v) => $enumDecode(
        _$EventDecisionResultDtoStatusEnumEnumMap,
        v,
        unknownValue: EventDecisionResultDtoStatusEnum.unknownDefaultOpenApi,
      ),
    ),
  );
  return val;
});

Map<String, dynamic> _$EventDecisionResultDtoToJson(
  EventDecisionResultDto instance,
) => <String, dynamic>{
  'status': _$EventDecisionResultDtoStatusEnumEnumMap[instance.status]!,
};

const _$EventDecisionResultDtoStatusEnumEnumMap = {
  EventDecisionResultDtoStatusEnum.APPROVED: 'APPROVED',
  EventDecisionResultDtoStatusEnum.DECLINED: 'DECLINED',
  EventDecisionResultDtoStatusEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
