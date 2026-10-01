// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parent_decision_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentDecisionDtoCWProxy {
  ParentDecisionDto approve(bool approve);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentDecisionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentDecisionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentDecisionDto call({bool approve});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentDecisionDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentDecisionDto.copyWith.fieldName(...)`
class _$ParentDecisionDtoCWProxyImpl implements _$ParentDecisionDtoCWProxy {
  const _$ParentDecisionDtoCWProxyImpl(this._value);

  final ParentDecisionDto _value;

  @override
  ParentDecisionDto approve(bool approve) => this(approve: approve);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentDecisionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentDecisionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentDecisionDto call({Object? approve = const $CopyWithPlaceholder()}) {
    return ParentDecisionDto(
      approve: approve == const $CopyWithPlaceholder()
          ? _value.approve
          // ignore: cast_nullable_to_non_nullable
          : approve as bool,
    );
  }
}

extension $ParentDecisionDtoCopyWith on ParentDecisionDto {
  /// Returns a callable class that can be used as follows: `instanceOfParentDecisionDto.copyWith(...)` or like so:`instanceOfParentDecisionDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentDecisionDtoCWProxy get copyWith =>
      _$ParentDecisionDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentDecisionDto _$ParentDecisionDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ParentDecisionDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['approve']);
      final val = ParentDecisionDto(
        approve: $checkedConvert('approve', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$ParentDecisionDtoToJson(ParentDecisionDto instance) =>
    <String, dynamic>{'approve': instance.approve};
