// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pairing_approve_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PairingApproveDtoCWProxy {
  PairingApproveDto code(String code);

  PairingApproveDto childId(String childId);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingApproveDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingApproveDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingApproveDto call({String code, String childId});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPairingApproveDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPairingApproveDto.copyWith.fieldName(...)`
class _$PairingApproveDtoCWProxyImpl implements _$PairingApproveDtoCWProxy {
  const _$PairingApproveDtoCWProxyImpl(this._value);

  final PairingApproveDto _value;

  @override
  PairingApproveDto code(String code) => this(code: code);

  @override
  PairingApproveDto childId(String childId) => this(childId: childId);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingApproveDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingApproveDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingApproveDto call({
    Object? code = const $CopyWithPlaceholder(),
    Object? childId = const $CopyWithPlaceholder(),
  }) {
    return PairingApproveDto(
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as String,
      childId: childId == const $CopyWithPlaceholder()
          ? _value.childId
          // ignore: cast_nullable_to_non_nullable
          : childId as String,
    );
  }
}

extension $PairingApproveDtoCopyWith on PairingApproveDto {
  /// Returns a callable class that can be used as follows: `instanceOfPairingApproveDto.copyWith(...)` or like so:`instanceOfPairingApproveDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PairingApproveDtoCWProxy get copyWith =>
      _$PairingApproveDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PairingApproveDto _$PairingApproveDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PairingApproveDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['code', 'childId']);
      final val = PairingApproveDto(
        code: $checkedConvert('code', (v) => v as String),
        childId: $checkedConvert('childId', (v) => v as String),
      );
      return val;
    });

Map<String, dynamic> _$PairingApproveDtoToJson(PairingApproveDto instance) =>
    <String, dynamic>{'code': instance.code, 'childId': instance.childId};
