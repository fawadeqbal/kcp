// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'pairing_started_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PairingStartedDtoCWProxy {
  PairingStartedDto pairingId(String pairingId);

  PairingStartedDto code(String code);

  PairingStartedDto secret(String secret);

  PairingStartedDto expiresAt(DateTime expiresAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingStartedDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingStartedDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingStartedDto call({
    String pairingId,
    String code,
    String secret,
    DateTime expiresAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPairingStartedDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPairingStartedDto.copyWith.fieldName(...)`
class _$PairingStartedDtoCWProxyImpl implements _$PairingStartedDtoCWProxy {
  const _$PairingStartedDtoCWProxyImpl(this._value);

  final PairingStartedDto _value;

  @override
  PairingStartedDto pairingId(String pairingId) => this(pairingId: pairingId);

  @override
  PairingStartedDto code(String code) => this(code: code);

  @override
  PairingStartedDto secret(String secret) => this(secret: secret);

  @override
  PairingStartedDto expiresAt(DateTime expiresAt) => this(expiresAt: expiresAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PairingStartedDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PairingStartedDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PairingStartedDto call({
    Object? pairingId = const $CopyWithPlaceholder(),
    Object? code = const $CopyWithPlaceholder(),
    Object? secret = const $CopyWithPlaceholder(),
    Object? expiresAt = const $CopyWithPlaceholder(),
  }) {
    return PairingStartedDto(
      pairingId: pairingId == const $CopyWithPlaceholder()
          ? _value.pairingId
          // ignore: cast_nullable_to_non_nullable
          : pairingId as String,
      code: code == const $CopyWithPlaceholder()
          ? _value.code
          // ignore: cast_nullable_to_non_nullable
          : code as String,
      secret: secret == const $CopyWithPlaceholder()
          ? _value.secret
          // ignore: cast_nullable_to_non_nullable
          : secret as String,
      expiresAt: expiresAt == const $CopyWithPlaceholder()
          ? _value.expiresAt
          // ignore: cast_nullable_to_non_nullable
          : expiresAt as DateTime,
    );
  }
}

extension $PairingStartedDtoCopyWith on PairingStartedDto {
  /// Returns a callable class that can be used as follows: `instanceOfPairingStartedDto.copyWith(...)` or like so:`instanceOfPairingStartedDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PairingStartedDtoCWProxy get copyWith =>
      _$PairingStartedDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PairingStartedDto _$PairingStartedDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PairingStartedDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const ['pairingId', 'code', 'secret', 'expiresAt'],
      );
      final val = PairingStartedDto(
        pairingId: $checkedConvert('pairingId', (v) => v as String),
        code: $checkedConvert('code', (v) => v as String),
        secret: $checkedConvert('secret', (v) => v as String),
        expiresAt: $checkedConvert(
          'expiresAt',
          (v) => DateTime.parse(v as String),
        ),
      );
      return val;
    });

Map<String, dynamic> _$PairingStartedDtoToJson(PairingStartedDto instance) =>
    <String, dynamic>{
      'pairingId': instance.pairingId,
      'code': instance.code,
      'secret': instance.secret,
      'expiresAt': instance.expiresAt.toIso8601String(),
    };
