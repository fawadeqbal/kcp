// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pairing_status_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PairingStatusDtoCWProxy {
  PairingStatusDto status(PairingStatusDtoStatusEnum status);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingStatusDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingStatusDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingStatusDto call({PairingStatusDtoStatusEnum status});
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPairingStatusDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPairingStatusDto.copyWith.fieldName(...)`
class _$PairingStatusDtoCWProxyImpl implements _$PairingStatusDtoCWProxy {
  const _$PairingStatusDtoCWProxyImpl(this._value);

  final PairingStatusDto _value;

  @override
  PairingStatusDto status(PairingStatusDtoStatusEnum status) =>
      this(status: status);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingStatusDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingStatusDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingStatusDto call({Object? status = const $CopyWithPlaceholder()}) {
    return PairingStatusDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as PairingStatusDtoStatusEnum,
    );
  }
}

extension $PairingStatusDtoCopyWith on PairingStatusDto {
  /// Returns a callable class that can be used as follows: `instanceOfPairingStatusDto.copyWith(...)` or like so:`instanceOfPairingStatusDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PairingStatusDtoCWProxy get copyWith => _$PairingStatusDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PairingStatusDto _$PairingStatusDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PairingStatusDto', json, ($checkedConvert) {
      $checkKeys(json, requiredKeys: const ['status']);
      final val = PairingStatusDto(
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$PairingStatusDtoStatusEnumEnumMap,
            v,
            unknownValue: PairingStatusDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
      );
      return val;
    });

Map<String, dynamic> _$PairingStatusDtoToJson(PairingStatusDto instance) =>
    <String, dynamic>{
      'status': _$PairingStatusDtoStatusEnumEnumMap[instance.status]!,
    };

const _$PairingStatusDtoStatusEnumEnumMap = {
  PairingStatusDtoStatusEnum.expired: 'expired',
  PairingStatusDtoStatusEnum.waiting: 'waiting',
  PairingStatusDtoStatusEnum.approved: 'approved',
  PairingStatusDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
