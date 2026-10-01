// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payout_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$PayoutDtoCWProxy {
  PayoutDto status(PayoutDtoStatusEnum status);

  PayoutDto id(String id);

  PayoutDto reference(String reference);

  PayoutDto childId(String childId);

  PayoutDto childNickname(String childNickname);

  PayoutDto currency(String currency);

  PayoutDto amountMinor(num amountMinor);

  PayoutDto withheldMinor(num withheldMinor);

  PayoutDto netMinor(num netMinor);

  PayoutDto accountLast4(String? accountLast4);

  PayoutDto createdAt(DateTime createdAt);

  PayoutDto paidAt(DateTime? paidAt);

  PayoutDto canConfirm(bool canConfirm);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PayoutDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PayoutDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PayoutDto call({
    PayoutDtoStatusEnum status,
    String id,
    String reference,
    String childId,
    String childNickname,
    String currency,
    num amountMinor,
    num withheldMinor,
    num netMinor,
    String? accountLast4,
    DateTime createdAt,
    DateTime? paidAt,
    bool canConfirm,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfPayoutDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfPayoutDto.copyWith.fieldName(...)`
class _$PayoutDtoCWProxyImpl implements _$PayoutDtoCWProxy {
  const _$PayoutDtoCWProxyImpl(this._value);

  final PayoutDto _value;

  @override
  PayoutDto status(PayoutDtoStatusEnum status) => this(status: status);

  @override
  PayoutDto id(String id) => this(id: id);

  @override
  PayoutDto reference(String reference) => this(reference: reference);

  @override
  PayoutDto childId(String childId) => this(childId: childId);

  @override
  PayoutDto childNickname(String childNickname) =>
      this(childNickname: childNickname);

  @override
  PayoutDto currency(String currency) => this(currency: currency);

  @override
  PayoutDto amountMinor(num amountMinor) => this(amountMinor: amountMinor);

  @override
  PayoutDto withheldMinor(num withheldMinor) =>
      this(withheldMinor: withheldMinor);

  @override
  PayoutDto netMinor(num netMinor) => this(netMinor: netMinor);

  @override
  PayoutDto accountLast4(String? accountLast4) =>
      this(accountLast4: accountLast4);

  @override
  PayoutDto createdAt(DateTime createdAt) => this(createdAt: createdAt);

  @override
  PayoutDto paidAt(DateTime? paidAt) => this(paidAt: paidAt);

  @override
  PayoutDto canConfirm(bool canConfirm) => this(canConfirm: canConfirm);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `PayoutDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// PayoutDto(...).copyWith(id: 12, name: "My name")
  /// ````
  PayoutDto call({
    Object? status = const $CopyWithPlaceholder(),
    Object? id = const $CopyWithPlaceholder(),
    Object? reference = const $CopyWithPlaceholder(),
    Object? childId = const $CopyWithPlaceholder(),
    Object? childNickname = const $CopyWithPlaceholder(),
    Object? currency = const $CopyWithPlaceholder(),
    Object? amountMinor = const $CopyWithPlaceholder(),
    Object? withheldMinor = const $CopyWithPlaceholder(),
    Object? netMinor = const $CopyWithPlaceholder(),
    Object? accountLast4 = const $CopyWithPlaceholder(),
    Object? createdAt = const $CopyWithPlaceholder(),
    Object? paidAt = const $CopyWithPlaceholder(),
    Object? canConfirm = const $CopyWithPlaceholder(),
  }) {
    return PayoutDto(
      status: status == const $CopyWithPlaceholder()
          ? _value.status
          // ignore: cast_nullable_to_non_nullable
          : status as PayoutDtoStatusEnum,
      id: id == const $CopyWithPlaceholder()
          ? _value.id
          // ignore: cast_nullable_to_non_nullable
          : id as String,
      reference: reference == const $CopyWithPlaceholder()
          ? _value.reference
          // ignore: cast_nullable_to_non_nullable
          : reference as String,
      childId: childId == const $CopyWithPlaceholder()
          ? _value.childId
          // ignore: cast_nullable_to_non_nullable
          : childId as String,
      childNickname: childNickname == const $CopyWithPlaceholder()
          ? _value.childNickname
          // ignore: cast_nullable_to_non_nullable
          : childNickname as String,
      currency: currency == const $CopyWithPlaceholder()
          ? _value.currency
          // ignore: cast_nullable_to_non_nullable
          : currency as String,
      amountMinor: amountMinor == const $CopyWithPlaceholder()
          ? _value.amountMinor
          // ignore: cast_nullable_to_non_nullable
          : amountMinor as num,
      withheldMinor: withheldMinor == const $CopyWithPlaceholder()
          ? _value.withheldMinor
          // ignore: cast_nullable_to_non_nullable
          : withheldMinor as num,
      netMinor: netMinor == const $CopyWithPlaceholder()
          ? _value.netMinor
          // ignore: cast_nullable_to_non_nullable
          : netMinor as num,
      accountLast4: accountLast4 == const $CopyWithPlaceholder()
          ? _value.accountLast4
          // ignore: cast_nullable_to_non_nullable
          : accountLast4 as String?,
      createdAt: createdAt == const $CopyWithPlaceholder()
          ? _value.createdAt
          // ignore: cast_nullable_to_non_nullable
          : createdAt as DateTime,
      paidAt: paidAt == const $CopyWithPlaceholder()
          ? _value.paidAt
          // ignore: cast_nullable_to_non_nullable
          : paidAt as DateTime?,
      canConfirm: canConfirm == const $CopyWithPlaceholder()
          ? _value.canConfirm
          // ignore: cast_nullable_to_non_nullable
          : canConfirm as bool,
    );
  }
}

extension $PayoutDtoCopyWith on PayoutDto {
  /// Returns a callable class that can be used as follows: `instanceOfPayoutDto.copyWith(...)` or like so:`instanceOfPayoutDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$PayoutDtoCWProxy get copyWith => _$PayoutDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PayoutDto _$PayoutDtoFromJson(Map<String, dynamic> json) =>
    $checkedCreate('PayoutDto', json, ($checkedConvert) {
      $checkKeys(
        json,
        requiredKeys: const [
          'status',
          'id',
          'reference',
          'childId',
          'childNickname',
          'currency',
          'amountMinor',
          'withheldMinor',
          'netMinor',
          'accountLast4',
          'createdAt',
          'paidAt',
          'canConfirm',
        ],
      );
      final val = PayoutDto(
        status: $checkedConvert(
          'status',
          (v) => $enumDecode(
            _$PayoutDtoStatusEnumEnumMap,
            v,
            unknownValue: PayoutDtoStatusEnum.unknownDefaultOpenApi,
          ),
        ),
        id: $checkedConvert('id', (v) => v as String),
        reference: $checkedConvert('reference', (v) => v as String),
        childId: $checkedConvert('childId', (v) => v as String),
        childNickname: $checkedConvert('childNickname', (v) => v as String),
        currency: $checkedConvert('currency', (v) => v as String),
        amountMinor: $checkedConvert('amountMinor', (v) => v as num),
        withheldMinor: $checkedConvert('withheldMinor', (v) => v as num),
        netMinor: $checkedConvert('netMinor', (v) => v as num),
        accountLast4: $checkedConvert('accountLast4', (v) => v as String?),
        createdAt: $checkedConvert(
          'createdAt',
          (v) => DateTime.parse(v as String),
        ),
        paidAt: $checkedConvert(
          'paidAt',
          (v) => v == null ? null : DateTime.parse(v as String),
        ),
        canConfirm: $checkedConvert('canConfirm', (v) => v as bool),
      );
      return val;
    });

Map<String, dynamic> _$PayoutDtoToJson(PayoutDto instance) => <String, dynamic>{
  'status': _$PayoutDtoStatusEnumEnumMap[instance.status]!,
  'id': instance.id,
  'reference': instance.reference,
  'childId': instance.childId,
  'childNickname': instance.childNickname,
  'currency': instance.currency,
  'amountMinor': instance.amountMinor,
  'withheldMinor': instance.withheldMinor,
  'netMinor': instance.netMinor,
  'accountLast4': instance.accountLast4,
  'createdAt': instance.createdAt.toIso8601String(),
  'paidAt': instance.paidAt?.toIso8601String(),
  'canConfirm': instance.canConfirm,
};

const _$PayoutDtoStatusEnumEnumMap = {
  PayoutDtoStatusEnum.AWAITING_PARENT: 'AWAITING_PARENT',
  PayoutDtoStatusEnum.CONFIRMED: 'CONFIRMED',
  PayoutDtoStatusEnum.SENDING: 'SENDING',
  PayoutDtoStatusEnum.SENT: 'SENT',
  PayoutDtoStatusEnum.PAID: 'PAID',
  PayoutDtoStatusEnum.FAILED: 'FAILED',
  PayoutDtoStatusEnum.CANCELLED: 'CANCELLED',
  PayoutDtoStatusEnum.unknownDefaultOpenApi: 'unknown_default_open_api',
};
