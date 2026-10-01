// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'class_decision_result_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ClassDecisionResultDtoCWProxy {
  ClassDecisionResultDto status(ClassDecisionResultDtoStatusEnum status);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ClassDecisionResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ClassDecisionResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ClassDecisionResultDto call({ClassDecisionResultDtoStatusEnum status});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfClassDecisionResultDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfClassDecisionResultDto.copyWith.fieldName(...)`
class _$ClassDecisionResultDtoCWProxyImpl
    implements _$ClassDecisionResultDtoCWProxy {
  const _$ClassDecisionResultDtoCWProxyImpl(this._value);

  final ClassDecisionResultDto _value;

  @override
  ClassDecisionResultDto status(ClassDecisionResultDtoStatusEnum status) =>
      this(status: status);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ClassDecisionResultDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ClassDecisionResultDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ClassDecisionResultDto call({Object? status = const $CopyWithPlaceholder()}) {
    return ClassDecisionResultDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as ClassDecisionResultDtoStatusEnum,
    );
  }
}

extension $ClassDecisionResultDtoCopyWith on ClassDecisionResultDto {
  /// Returns a callable class that can be used as follows: `instanceOfClassDecisionResultDto.copyWith(...)` or like so:`instanceOfClassDecisionResultDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ClassDecisionResultDtoCWProxy get copyWith =>
      _$ClassDecisionResultDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ClassDecisionResultDto _$ClassDecisionResultDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ClassDecisionResultDto', json, ($checkedConvert) {
  $checkKeys(json, requiredKeys: const ['status']);
  final val = ClassDecisionResultDto(
    status: $checkedConvert(
      'status',
      (v) => $enumDecode(
        _$ClassDecisionResultDtoStatusEnumEnumMap,
        v,
        unknownValue: ClassDecisionResultDtoStatusEnum.unknownDefaultOpenApi,
      ),
    ),
  );
  return val;
});

Map<String, dynamic> _$ClassDecisionResultDtoToJson(
  ClassDecisionResultDto instance,
) => <String, dynamic>{
  'status': _$ClassDecisionResultDtoStatusEnumEnumMap[instance.status]!,
};

const _$ClassDecisionResultDtoStatusEnumEnumMap = {
  ClassDecisionResultDtoStatusEnum.APPROVED: 'APPROVED',
  ClassDecisionResultDtoStatusEnum.DECLINED: 'DECLINED',
  ClassDecisionResultDtoStatusEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
