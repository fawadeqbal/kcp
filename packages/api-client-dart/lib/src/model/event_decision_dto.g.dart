// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_decision_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$EventDecisionDtoCWProxy {
  EventDecisionDto childId(String childId);

  EventDecisionDto approve(bool approve);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EventDecisionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EventDecisionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EventDecisionDto call({String childId, bool approve});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfEventDecisionDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfEventDecisionDto.copyWith.fieldName(...)`
class _$EventDecisionDtoCWProxyImpl implements _$EventDecisionDtoCWProxy {
  const _$EventDecisionDtoCWProxyImpl(this._value);

  final EventDecisionDto _value;

  @override
  EventDecisionDto childId(String childId) => this(childId: childId);

  @override
  EventDecisionDto approve(bool approve) => this(approve: approve);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `EventDecisionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// EventDecisionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  EventDecisionDto call({
    Object? childId = const $CopyWithPlaceholder(),
    Object? approve = const $CopyWithPlaceholder(),
  }) {
    return EventDecisionDto(
      childId: childId == const $CopyWithPlaceholder()
          ? _value.childId
          // ignore: cast_nullable_to_non_nullable
          : childId as String,
      approve: approve == const $CopyWithPlaceholder()
          ? _value.approve
          // ignore: cast_nullable_to_non_nullable
          : approve as bool,
    );
  }
}

extension $EventDecisionDtoCopyWith on EventDecisionDto {
  /// Returns a callable class that can be used as follows: `instanceOfEventDecisionDto.copyWith(...)` or like so:`instanceOfEventDecisionDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$EventDecisionDtoCWProxy get copyWith => _$EventDecisionDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

EventDecisionDto _$EventDecisionDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('EventDecisionDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['childId', 'approve']);
      final val = EventDecisionDto(
        childId: $checkedConvert('childId', (v) => v as String),
        approve: $checkedConvert('approve', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$EventDecisionDtoToJson(EventDecisionDto instance) =>
    <String, dynamic>{'childId': instance.childId, 'approve': instance.approve};
