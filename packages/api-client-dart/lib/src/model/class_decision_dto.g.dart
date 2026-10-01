// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'class_decision_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ClassDecisionDtoCWProxy {
  ClassDecisionDto childId(String childId);

  ClassDecisionDto approve(bool approve);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ClassDecisionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ClassDecisionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ClassDecisionDto call({String childId, bool approve});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfClassDecisionDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfClassDecisionDto.copyWith.fieldName(...)`
class _$ClassDecisionDtoCWProxyImpl implements _$ClassDecisionDtoCWProxy {
  const _$ClassDecisionDtoCWProxyImpl(this._value);

  final ClassDecisionDto _value;

  @override
  ClassDecisionDto childId(String childId) => this(childId: childId);

  @override
  ClassDecisionDto approve(bool approve) => this(approve: approve);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ClassDecisionDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ClassDecisionDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ClassDecisionDto call({
    Object? childId = const $CopyWithPlaceholder(),
    Object? approve = const $CopyWithPlaceholder(),
  }) {
    return ClassDecisionDto(
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

extension $ClassDecisionDtoCopyWith on ClassDecisionDto {
  /// Returns a callable class that can be used as follows: `instanceOfClassDecisionDto.copyWith(...)` or like so:`instanceOfClassDecisionDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ClassDecisionDtoCWProxy get copyWith => _$ClassDecisionDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ClassDecisionDto _$ClassDecisionDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ClassDecisionDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['childId', 'approve']);
      final val = ClassDecisionDto(
        childId: $checkedConvert('childId', (v) => v as String),
        approve: $checkedConvert('approve', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$ClassDecisionDtoToJson(ClassDecisionDto instance) =>
    <String, dynamic>{'childId': instance.childId, 'approve': instance.approve};
