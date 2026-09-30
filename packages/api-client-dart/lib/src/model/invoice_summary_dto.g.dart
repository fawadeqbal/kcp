// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'invoice_summary_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$InvoiceSummaryDtoCWProxy {
  InvoiceSummaryDto id(String id);

  InvoiceSummaryDto number(String number);

  InvoiceSummaryDto status(InvoiceSummaryDtoStatusEnum status);

  InvoiceSummaryDto currency(String currency);

  InvoiceSummaryDto amountMinor(num amountMinor);

  InvoiceSummaryDto periodStart(DateTime periodStart);

  InvoiceSummaryDto periodEnd(DateTime periodEnd);

  InvoiceSummaryDto issuedAt(DateTime issuedAt);

  InvoiceSummaryDto paidAt(DateTime? paidAt);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `InvoiceSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// InvoiceSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  InvoiceSummaryDto call({
    String id,
    String number,
    InvoiceSummaryDtoStatusEnum status,
    String currency,
    num amountMinor,
    DateTime periodStart,
    DateTime periodEnd,
    DateTime issuedAt,
    DateTime? paidAt,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfInvoiceSummaryDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfInvoiceSummaryDto.copyWith.fieldName(...)`
class _$InvoiceSummaryDtoCWProxyImpl implements _$InvoiceSummaryDtoCWProxy {
  const _$InvoiceSummaryDtoCWProxyImpl(this._value);

  final InvoiceSummaryDto _value;

  @override
  InvoiceSummaryDto id(String id) => this(id: id);

  @override
  InvoiceSummaryDto number(String number) => this(number: number);

  @override
  InvoiceSummaryDto status(InvoiceSummaryDtoStatusEnum status) =>
      this(status: status);

  @override
  InvoiceSummaryDto currency(String currency) => this(currency: currency);

  @override
  InvoiceSummaryDto amountMinor(num amountMinor) =>
      this(amountMinor: amountMinor);

  @override
  InvoiceSummaryDto periodStart(DateTime periodStart) =>
      this(periodStart: periodStart);

  @override
  InvoiceSummaryDto periodEnd(DateTime periodEnd) => this(periodEnd: periodEnd);

  @override
  InvoiceSummaryDto issuedAt(DateTime issuedAt) => this(issuedAt: issuedAt);

  @override
  InvoiceSummaryDto paidAt(DateTime? paidAt) => this(paidAt: paidAt);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `InvoiceSummaryDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// InvoiceSummaryDto(...).copyWith(id: 12, name: "My name")
  /// ````
  InvoiceSummaryDto call({
    Object? id = const $CopyWithPlaceholder(),
    Object? number = const $CopyWithPlaceholder(),
    Object? status = const $CopyWithPlaceholder(),
    Object? currency = const $CopyWithPlaceholder(),
    Object? amountMinor = const $CopyWithPlaceholder(),
    Object? periodStart = const $CopyWithPlaceholder(),
    Object? periodEnd = const $CopyWithPlaceholder(),
    Object? issuedAt = const $CopyWithPlaceholder(),
    Object? paidAt = const $CopyWithPlaceholder(),
  }) {
    return InvoiceSummaryDto(
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      number: number == const $CopyWithPlaceholder()
          ? _value.number
          // ignore: cast_nullable_to_non_nullable
          : number as String,
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as InvoiceSummaryDtoStatusEnum,
      currency: currency == const $CopyWithPlaceholder()
          ? _value.currency
          // ignore: cast_nullable_to_non_nullable
          : currency as String,
      amountMinor: amountMinor == const $CopyWithPlaceholder()
          ? _value.amountMinor
          // ignore: cast_nullable_to_non_nullable
          : amountMinor as num,
      periodStart: periodStart == const $CopyWithPlaceholder()
          ? _value.periodStart
          // ignore: cast_nullable_to_non_nullable
          : periodStart as DateTime,
      periodEnd: periodEnd == const $CopyWithPlaceholder()
          ? _value.periodEnd
          // ignore: cast_nullable_to_non_nullable
          : periodEnd as DateTime,
      issuedAt: issuedAt == const $CopyWithPlaceholder()
          ? _value.issuedAt
          // ignore: cast_nullable_to_non_nullable
          : issuedAt as DateTime,
      paidAt: paidAt == const $CopyWithPlaceholder()
          ? _value.paidAt
          // ignore: cast_nullable_to_non_nullable
          : paidAt as DateTime?,
    );
  }
}

extension $InvoiceSummaryDtoCopyWith on InvoiceSummaryDto {
  /// Returns a callable class that can be used as follows: `instanceOfInvoiceSummaryDto.copyWith(...)` or like so:`instanceOfInvoiceSummaryDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$InvoiceSummaryDtoCWProxy get copyWith =>
      _$InvoiceSummaryDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

InvoiceSummaryDto _$InvoiceSummaryDtoFromJson(
  Map<String, dynamic> json,
) => $checkedCreate('InvoiceSummaryDto', json, ($checkedConvert) {
  $checkKeys(
    json,
    requiredKeys: const [
      'id',
      'number',
      'status',
      'currency',
      'amountMinor',
      'periodStart',
      'periodEnd',
      'issuedAt',
      'paidAt',
    ],
  );
  final val = InvoiceSummaryDto(
    id: $checkedConvert('id', (v) => v as String),
    number: $checkedConvert('number', (v) => v as String),
    status: $checkedConvert(
      'status',
      (v) => $enumDecode(
        _$InvoiceSummaryDtoStatusEnumEnumMap,
        v,
        unknownValue: InvoiceSummaryDtoStatusEnum.unknownDefaultOpenApi,
      ),
    ),
    currency: $checkedConvert('currency', (v) => v as String),
    amountMinor: $checkedConvert('amountMinor', (v) => v as num),
    periodStart: $checkedConvert(
      'periodStart',
      (v) => DateTime.parse(v as String),
    ),
    periodEnd: $checkedConvert('periodEnd', (v) => DateTime.parse(v as String)),
    issuedAt: $checkedConvert('issuedAt', (v) => DateTime.parse(v as String)),
    paidAt: $checkedConvert(
      'paidAt',
      (v) => v == null ? null : DateTime.parse(v as String),
    ),
  );
  return val;
});

Map<String, dynamic> _$InvoiceSummaryDtoToJson(InvoiceSummaryDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'number': instance.number,
      'status': _$InvoiceSummaryDtoStatusEnumEnumMap[instance.status]!,
      'currency': instance.currency,
      'amountMinor': instance.amountMinor,
      'periodStart': instance.periodStart.toIso8601String(),
      'periodEnd': instance.periodEnd.toIso8601String(),
      'issuedAt': instance.issuedAt.toIso8601String(),
      'paidAt': instance.paidAt?.toIso8601String(),
    };

const _$InvoiceSummaryDtoStatusEnumEnumMap = {
  InvoiceSummaryDtoStatusEnum.OPEN: 'OPEN',
  InvoiceSummaryDtoStatusEnum.PAID: 'PAID',
  InvoiceSummaryDtoStatusEnum.VOID: 'VOID',
  InvoiceSummaryDtoStatusEnum.REFUNDED: 'REFUNDED',
  InvoiceSummaryDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
