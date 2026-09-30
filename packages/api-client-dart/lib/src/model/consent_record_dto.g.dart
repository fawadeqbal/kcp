// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'consent_record_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ConsentRecordDtoCWProxy {
  ConsentRecordDto id(String id);

  ConsentRecordDto type(ConsentRecordDtoTypeEnum type);

  ConsentRecordDto policyVersion(String policyVersion);

  ConsentRecordDto method(String method);

  ConsentRecordDto grantedAt(DateTime grantedAt);

  ConsentRecordDto revokedAt(DateTime? revokedAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ConsentRecordDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ConsentRecordDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ConsentRecordDto call({
    String id,
    ConsentRecordDtoTypeEnum type,
    String policyVersion,
    String method,
    DateTime grantedAt,
    DateTime? revokedAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfConsentRecordDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfConsentRecordDto.copyWith.fieldName(...)`
class _$ConsentRecordDtoCWProxyImpl implements _$ConsentRecordDtoCWProxy {
  const _$ConsentRecordDtoCWProxyImpl(this._value);

  final ConsentRecordDto _value;

  @override
  ConsentRecordDto id(String id) => this(id: id);

  @override
  ConsentRecordDto type(ConsentRecordDtoTypeEnum type) => this(type: type);

  @override
  ConsentRecordDto policyVersion(String policyVersion) =>
      this(policyVersion: policyVersion);

  @override
  ConsentRecordDto method(String method) => this(method: method);

  @override
  ConsentRecordDto grantedAt(DateTime grantedAt) => this(grantedAt: grantedAt);

  @override
  ConsentRecordDto revokedAt(DateTime? revokedAt) => this(revokedAt: revokedAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ConsentRecordDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ConsentRecordDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ConsentRecordDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? type = const $CopyWithPlaceholder(),
    Object? policyVersion = const $CopyWithPlaceholder(),
    Object? method = const $CopyWithPlaceholder(),
    Object? grantedAt = const $CopyWithPlaceholder(),
    Object? revokedAt = const $CopyWithPlaceholder(),
  }) {
    return ConsentRecordDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      type: type == const $CopyWithPlaceholder()
          ? _value.type
          // ignore: cast_nullable_to_non_nullable
          : type as ConsentRecordDtoTypeEnum,
      policyVersion: policyVersion == const $CopyWithPlaceholder()
          ? _value.policyVersion
          // ignore: cast_nullable_to_non_nullable
          : policyVersion as String,
      method: method == const $CopyWithPlaceholder()
          ? _value.method
          // ignore: cast_nullable_to_non_nullable
          : method as String,
      grantedAt: grantedAt == const $CopyWithPlaceholder()
          ? _value.grantedAt
          // ignore: cast_nullable_to_non_nullable
          : grantedAt as DateTime,
      revokedAt: revokedAt == const $CopyWithPlaceholder()
          ? _value.revokedAt
          // ignore: cast_nullable_to_non_nullable
          : revokedAt as DateTime?,
    );
  }
}

extension $ConsentRecordDtoCopyWith on ConsentRecordDto {
  /// Returns a callable class that can be used as follows: `instanceOfConsentRecordDto.copyWith(...)` or like so:`instanceOfConsentRecordDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ConsentRecordDtoCWProxy get copyWith => _$ConsentRecordDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ConsentRecordDto _$ConsentRecordDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('ConsentRecordDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'id',
          'type',
          'policyVersion',
          'method',
          'grantedAt',
          'revokedAt',
        ],
      );
      final val = ConsentRecordDto(
        id: $checkedConvert('id', (v) => v as String),
        type: $checkedConvert(
          'type',
          (v) => $enumDecode(
            _$ConsentRecordDtoTypeEnumEnumMap,
            v,
            unknownValue: ConsentRecordDtoTypeEnum.unknownDefaultOpenApi,
          ),
        ),
        policyVersion: $checkedConvert('policyVersion', (v) => v as String),
        method: $checkedConvert('method', (v) => v as String),
        grantedAt: $checkedConvert(
          'grantedAt',
          (v) => DateTime.parse(v as String),
        ),
        revokedAt: $checkedConvert(
          'revokedAt',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
      );
      return val;
    });

Map<String, dynamic> _$ConsentRecordDtoToJson(ConsentRecordDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': _$ConsentRecordDtoTypeEnumEnumMap[instance.type]!,
      'policyVersion': instance.policyVersion,
      'method': instance.method,
      'grantedAt': instance.grantedAt.toIso8601String(),
      'revokedAt': instance.revokedAt?.toIso8601String(),
    };

const _$ConsentRecordDtoTypeEnumEnumMap = {
  ConsentRecordDtoTypeEnum.ACCOUNT: 'ACCOUNT',
  ConsentRecordDtoTypeEnum.PUBLIC_LEADERBOARDS: 'PUBLIC_LEADERBOARDS',
  ConsentRecordDtoTypeEnum.PUBLIC_PORTFOLIO: 'PUBLIC_PORTFOLIO',
  ConsentRecordDtoTypeEnum.HUB_WORK: 'HUB_WORK',
  ConsentRecordDtoTypeEnum.EARNINGS: 'EARNINGS',
  ConsentRecordDtoTypeEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
