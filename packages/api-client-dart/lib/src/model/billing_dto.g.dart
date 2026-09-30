// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'billing_dto.dart';

// **************************************************************************
// CopyWithGenerator
// **************************************************************************

abstract class _$BillingDtoCWProxy {
  BillingDto countryCode(String? countryCode);

  BillingDto currency(String? currency);

  BillingDto familyDiscountPercent(num? familyDiscountPercent);

  BillingDto trialDays(num trialDays);

  BillingDto checkoutAvailable(bool checkoutAvailable);

  BillingDto plans(List<PlanOptionDto> plans);

  BillingDto children(List<ChildPremiumDto> children);

  BillingDto subscription(SubscriptionDto? subscription);

  BillingDto invoices(List<InvoiceSummaryDto> invoices);

  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BillingDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BillingDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BillingDto call({
    String? countryCode,
    String? currency,
    num? familyDiscountPercent,
    num trialDays,
    bool checkoutAvailable,
    List<PlanOptionDto> plans,
    List<ChildPremiumDto> children,
    SubscriptionDto? subscription,
    List<InvoiceSummaryDto> invoices,
  });
}

/// Proxy class for `copyWith` functionality. This is a callable class and can be used as follows: `instanceOfBillingDto.copyWith(...)`. Additionally contains functions for specific fields e.g. `instanceOfBillingDto.copyWith.fieldName(...)`
class _$BillingDtoCWProxyImpl implements _$BillingDtoCWProxy {
  const _$BillingDtoCWProxyImpl(this._value);

  final BillingDto _value;

  @override
  BillingDto countryCode(String? countryCode) => this(countryCode: countryCode);

  @override
  BillingDto currency(String? currency) => this(currency: currency);

  @override
  BillingDto familyDiscountPercent(num? familyDiscountPercent) =>
      this(familyDiscountPercent: familyDiscountPercent);

  @override
  BillingDto trialDays(num trialDays) => this(trialDays: trialDays);

  @override
  BillingDto checkoutAvailable(bool checkoutAvailable) =>
      this(checkoutAvailable: checkoutAvailable);

  @override
  BillingDto plans(List<PlanOptionDto> plans) => this(plans: plans);

  @override
  BillingDto children(List<ChildPremiumDto> children) =>
      this(children: children);

  @override
  BillingDto subscription(SubscriptionDto? subscription) =>
      this(subscription: subscription);

  @override
  BillingDto invoices(List<InvoiceSummaryDto> invoices) =>
      this(invoices: invoices);

  @override
  /// This function **does support** nullification of nullable fields. All `null` values passed to `non-nullable` fields will be ignored. You can also use `BillingDto(...).copyWith.fieldName(...)` to override fields one at a time with nullification support.
  ///
  /// Usage
  /// ```dart
  /// BillingDto(...).copyWith(id: 12, name: "My name")
  /// ````
  BillingDto call({
    Object? countryCode = const $CopyWithPlaceholder(),
    Object? currency = const $CopyWithPlaceholder(),
    Object? familyDiscountPercent = const $CopyWithPlaceholder(),
    Object? trialDays = const $CopyWithPlaceholder(),
    Object? checkoutAvailable = const $CopyWithPlaceholder(),
    Object? plans = const $CopyWithPlaceholder(),
    Object? children = const $CopyWithPlaceholder(),
    Object? subscription = const $CopyWithPlaceholder(),
    Object? invoices = const $CopyWithPlaceholder(),
  }) {
    return BillingDto(
      countryCode: countryCode == const $CopyWithPlaceholder()
          ? _value.countryCode
          // ignore: cast_nullable_to_non_nullable
          : countryCode as String?,
      currency: currency == const $CopyWithPlaceholder()
          ? _value.currency
          // ignore: cast_nullable_to_non_nullable
          : currency as String?,
      familyDiscountPercent:
          familyDiscountPercent == const $CopyWithPlaceholder()
          ? _value.familyDiscountPercent
          // ignore: cast_nullable_to_non_nullable
          : familyDiscountPercent as num?,
      trialDays: trialDays == const $CopyWithPlaceholder()
          ? _value.trialDays
          // ignore: cast_nullable_to_non_nullable
          : trialDays as num,
      checkoutAvailable: checkoutAvailable == const $CopyWithPlaceholder()
          ? _value.checkoutAvailable
          // ignore: cast_nullable_to_non_nullable
          : checkoutAvailable as bool,
      plans: plans == const $CopyWithPlaceholder()
          ? _value.plans
          // ignore: cast_nullable_to_non_nullable
          : plans as List<PlanOptionDto>,
      children: children == const $CopyWithPlaceholder()
          ? _value.children
          // ignore: cast_nullable_to_non_nullable
          : children as List<ChildPremiumDto>,
      subscription: subscription == const $CopyWithPlaceholder()
          ? _value.subscription
          // ignore: cast_nullable_to_non_nullable
          : subscription as SubscriptionDto?,
      invoices: invoices == const $CopyWithPlaceholder()
          ? _value.invoices
          // ignore: cast_nullable_to_non_nullable
          : invoices as List<InvoiceSummaryDto>,
    );
  }
}

extension $BillingDtoCopyWith on BillingDto {
  /// Returns a callable class that can be used as follows: `instanceOfBillingDto.copyWith(...)` or like so:`instanceOfBillingDto.copyWith.fieldName(...)`.
  // ignore: library_private_types_in_public_api
  _$BillingDtoCWProxy get copyWith => _$BillingDtoCWProxyImpl(this);
}

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

BillingDto _$BillingDtoFromJson(Map<String, dynamic> json) => $checkedCreate(
  'BillingDto',
  json,
  ($checkedConvert) {
    $checkKeys(
      json,
      requiredKeys: const [
        'countryCode',
        'currency',
        'familyDiscountPercent',
        'trialDays',
        'checkoutAvailable',
        'plans',
        'children',
        'subscription',
        'invoices',
      ],
    );
    final val = BillingDto(
      countryCode: $checkedConvert('countryCode', (v) => v as String?),
      currency: $checkedConvert('currency', (v) => v as String?),
      familyDiscountPercent: $checkedConvert(
        'familyDiscountPercent',
        (v) => v as num?,
      ),
      trialDays: $checkedConvert('trialDays', (v) => v as num),
      checkoutAvailable: $checkedConvert('checkoutAvailable', (v) => v as bool),
      plans: $checkedConvert(
        'plans',
        (v) => (v as List<dynamic>)
            .map((e) => PlanOptionDto.fromJson(e as Map<String, dynamic>))
            .toList(),
      ),
      children: $checkedConvert(
        'children',
        (v) => (v as List<dynamic>)
            .map((e) => ChildPremiumDto.fromJson(e as Map<String, dynamic>))
            .toList(),
      ),
      subscription: $checkedConvert(
        'subscription',
        (v) => v == null
            ? null
            : SubscriptionDto.fromJson(v as Map<String, dynamic>),
      ),
      invoices: $checkedConvert(
        'invoices',
        (v) => (v as List<dynamic>)
            .map((e) => InvoiceSummaryDto.fromJson(e as Map<String, dynamic>))
            .toList(),
      ),
    );
    return val;
  },
);

Map<String, dynamic> _$BillingDtoToJson(BillingDto instance) =>
    <String, dynamic>{
      'countryCode': instance.countryCode,
      'currency': instance.currency,
      'familyDiscountPercent': instance.familyDiscountPercent,
      'trialDays': instance.trialDays,
      'checkoutAvailable': instance.checkoutAvailable,
      'plans': instance.plans.map((e) => e.toJson()).toList(),
      'children': instance.children.map((e) => e.toJson()).toList(),
      'subscription': instance.subscription?.toJson(),
      'invoices': instance.invoices.map((e) => e.toJson()).toList(),
    };
