// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'parental_consent_status_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$ParentalConsentStatusDtoCWProxy {
  ParentalConsentStatusDto status(ParentalConsentStatusDtoStatusEnum status);

  ParentalConsentStatusDto method(ParentalConsentStatusDtoMethodEnum? method);

  ParentalConsentStatusDto methods(
    List<ParentalConsentStatusDtoMethodsEnum> methods,
  );

  ParentalConsentStatusDto rejectReason(String? rejectReason);

  ParentalConsentStatusDto submittedAt(DateTime? submittedAt);

  ParentalConsentStatusDto cardsAvailable(bool cardsAvailable);

  ParentalConsentStatusDto deleteAfter(DateTime? deleteAfter);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentalConsentStatusDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentalConsentStatusDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentalConsentStatusDto call({
    ParentalConsentStatusDtoStatusEnum status,
    ParentalConsentStatusDtoMethodEnum? method,
    List<ParentalConsentStatusDtoMethodsEnum> methods,
    String? rejectReason,
    DateTime? submittedAt,
    bool cardsAvailable,
    DateTime? deleteAfter,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfParentalConsentStatusDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfParentalConsentStatusDto.copyWith.fieldName(...)`
class _$ParentalConsentStatusDtoCWProxyImpl
    implements _$ParentalConsentStatusDtoCWProxy {
  const _$ParentalConsentStatusDtoCWProxyImpl(this._value);

  final ParentalConsentStatusDto _value;

  @override
  ParentalConsentStatusDto status(ParentalConsentStatusDtoStatusEnum status) =>
      this(status: status);

  @override
  ParentalConsentStatusDto method(ParentalConsentStatusDtoMethodEnum? method) =>
      this(method: method);

  @override
  ParentalConsentStatusDto methods(
    List<ParentalConsentStatusDtoMethodsEnum> methods,
  ) => this(methods: methods);

  @override
  ParentalConsentStatusDto rejectReason(String? rejectReason) =>
      this(rejectReason: rejectReason);

  @override
  ParentalConsentStatusDto submittedAt(DateTime? submittedAt) =>
      this(submittedAt: submittedAt);

  @override
  ParentalConsentStatusDto cardsAvailable(bool cardsAvailable) =>
      this(cardsAvailable: cardsAvailable);

  @override
  ParentalConsentStatusDto deleteAfter(DateTime? deleteAfter) =>
      this(deleteAfter: deleteAfter);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `ParentalConsentStatusDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// ParentalConsentStatusDto(...).copyWith(id: 12, name: "My name")
  /// ````
  ParentalConsentStatusDto call({
    Object? status = const $CopyWithPlaceholder(),
    Object? method = const $CopyWithPlaceholder(),
    Object? methods = const $CopyWithPlaceholder(),
    Object? rejectReason = const $CopyWithPlaceholder(),
    Object? submittedAt = const $CopyWithPlaceholder(),
    Object? cardsAvailable = const $CopyWithPlaceholder(),
    Object? deleteAfter = const $CopyWithPlaceholder(),
  }) {
    return ParentalConsentStatusDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as ParentalConsentStatusDtoStatusEnum,
      method: method == const $CopyWithPlaceholder()
          ? _value.method
          // ignore: cast_nullable_to_non_nullable
          : method as ParentalConsentStatusDtoMethodEnum?,
      methods: methods == const $CopyWithPlaceholder()
          ? _value.methods
          // ignore: cast_nullable_to_non_nullable
          : methods as List<ParentalConsentStatusDtoMethodsEnum>,
      rejectReason: rejectReason == const $CopyWithPlaceholder()
          ? _value.rejectReason
          // ignore: cast_nullable_to_non_nullable
          : rejectReason as String?,
      submittedAt: submittedAt == const $CopyWithPlaceholder()
          ? _value.submittedAt
          // ignore: cast_nullable_to_non_nullable
          : submittedAt as DateTime?,
      cardsAvailable: cardsAvailable == const $CopyWithPlaceholder()
          ? _value.cardsAvailable
          // ignore: cast_nullable_to_non_nullable
          : cardsAvailable as bool,
      deleteAfter: deleteAfter == const $CopyWithPlaceholder()
          ? _value.deleteAfter
          // ignore: cast_nullable_to_non_nullable
          : deleteAfter as DateTime?,
    );
  }
}

extension $ParentalConsentStatusDtoCopyWith on ParentalConsentStatusDto {
  /// Returns a callable class that can be used as follows: `instanceOfParentalConsentStatusDto.copyWith(...)` or like so:`instanceOfParentalConsentStatusDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$ParentalConsentStatusDtoCWProxy get copyWith =>
      _$ParentalConsentStatusDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ParentalConsentStatusDto _$ParentalConsentStatusDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('ParentalConsentStatusDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'status',
      'method',
      'methods',
      'rejectReason',
      'submittedAt',
      'cardsAvailable',
      'deleteAfter',
    ],
  );
  final val = ParentalConsentStatusDto(
    status: $checkedConvert(
      'status',
      (v) => $enumDecode(
        _$ParentalConsentStatusDtoStatusEnumEnumMap,
        v,
        unknownValue: ParentalConsentStatusDtoStatusEnum.unknownDefaultOpenApi,
      ),
    ),
    method: $checkedConvert(
      'method',
      (v) => $enumDecodeNullable(
        _$ParentalConsentStatusDtoMethodEnumEnumMap,
        v,
        unknownValue: ParentalConsentStatusDtoMethodEnum.unknownDefaultOpenApi,
      ),
    ),
    methods: $checkedConvert(
      'methods',
      (v) => (v as List<dynamic>)
          .map(
            (e) => $enumDecode(
              _$ParentalConsentStatusDtoMethodsEnumEnumMap,
              e,
              unknownValue:
                  ParentalConsentStatusDtoMethodsEnum.unknownDefaultOpenApi,
            ),
          )
          .toList(),
    ),
    rejectReason: $checkedConvert('rejectReason', (v) => v as String?),
    submittedAt: $checkedConvert(
      'submittedAt',
      (v) => v == null ? null : DateTime.parse(v as String),
    ),
    cardsAvailable: $checkedConvert('cardsAvailable', (v) => v as bool),
    deleteAfter: $checkedConvert(
      'deleteAfter',
      (v) => v == null ? null : DateTime.parse(v as String),
    ),
  );
  return val;
});

Map<String, dynamic> _$ParentalConsentStatusDtoToJson(
  ParentalConsentStatusDto instance,
) => <String, dynamic>{
  'status': _$ParentalConsentStatusDtoStatusEnumEnumMap[instance.status]!,
  'method': _$ParentalConsentStatusDtoMethodEnumEnumMap[instance.method],
  'methods': instance.methods
      .map((e) => _$ParentalConsentStatusDtoMethodsEnumEnumMap[e]!)
      .toList(),
  'rejectReason': instance.rejectReason,
  'submittedAt': instance.submittedAt?.toIso8601String(),
  'cardsAvailable': instance.cardsAvailable,
  'deleteAfter': instance.deleteAfter?.toIso8601String(),
};

const _$ParentalConsentStatusDtoStatusEnumEnumMap = {
  ParentalConsentStatusDtoStatusEnum.PENDING: 'PENDING',
  ParentalConsentStatusDtoStatusEnum.SUBMITTED: 'SUBMITTED',
  ParentalConsentStatusDtoStatusEnum.EXPIRED: 'EXPIRED',
  ParentalConsentStatusDtoStatusEnum.VERIFIED: 'VERIFIED',
  ParentalConsentStatusDtoStatusEnum.REJECTED: 'REJECTED',
  ParentalConsentStatusDtoStatusEnum.NOT_NEEDED: 'NOT_NEEDED',
  ParentalConsentStatusDtoStatusEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};

const _$ParentalConsentStatusDtoMethodEnumEnumMap = {
  ParentalConsentStatusDtoMethodEnum.SIGNED_FORM: 'SIGNED_FORM',
  ParentalConsentStatusDtoMethodEnum.EMAIL_PLUS: 'EMAIL_PLUS',
  ParentalConsentStatusDtoMethodEnum.CARD_CHECK: 'CARD_CHECK',
  ParentalConsentStatusDtoMethodEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};

const _$ParentalConsentStatusDtoMethodsEnumEnumMap = {
  ParentalConsentStatusDtoMethodsEnum.SIGNED_FORM: 'SIGNED_FORM',
  ParentalConsentStatusDtoMethodsEnum.EMAIL_PLUS: 'EMAIL_PLUS',
  ParentalConsentStatusDtoMethodsEnum.CARD_CHECK: 'CARD_CHECK',
  ParentalConsentStatusDtoMethodsEnum.unknownDefaultOpenApi:
      'unknown_default_open_api',
};
