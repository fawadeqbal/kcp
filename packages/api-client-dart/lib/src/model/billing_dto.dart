//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//

// ignore_for_file: unused_element
import 'package:kcp_api/src/model/subscription_dto.dart';
import 'package:kcp_api/src/model/invoice_summary_dto.dart';
import 'package:kcp_api/src/model/child_premium_dto.dart';
import 'package:kcp_api/src/model/plan_option_dto.dart';
import 'package:copy_with_extension/copy_with_extension.dart';
import 'package:json_annotation/json_annotation.dart';

part 'billing_dto.g.dart';

@CopyWith()
@JsonSerializable(
  checked: true,
  createToJson: true,
  disallowUnrecognizedKeys: false,
  explicitToJson: true,
)
class BillingDto {
  /// Returns a new [BillingDto] instance.
  BillingDto({
    required this.countryCode,

    required this.currency,

    required this.familyDiscountPercent,

    required this.trialDays,

    required this.checkoutAvailable,

    required this.plans,

    required this.children,

    required this.subscription,

    required this.invoices,
  });

  @JsonKey(name: r'countryCode', required: true, includeIfNull: true)
  final String? countryCode;

  @JsonKey(name: r'currency', required: true, includeIfNull: true)
  final String? currency;

  /// Each child after the first costs this much less.
  @JsonKey(name: r'familyDiscountPercent', required: true, includeIfNull: true)
  final num? familyDiscountPercent;

  @JsonKey(name: r'trialDays', required: true, includeIfNull: false)
  final num trialDays;

  /// Families can buy a plan by card here (payments switched on, cards available).
  @JsonKey(name: r'checkoutAvailable', required: true, includeIfNull: false)
  final bool checkoutAvailable;

  @JsonKey(name: r'plans', required: true, includeIfNull: false)
  final List<PlanOptionDto> plans;

  @JsonKey(name: r'children', required: true, includeIfNull: false)
  final List<ChildPremiumDto> children;

  /// The plan that gives premium now, or the latest one.
  @JsonKey(name: r'subscription', required: true, includeIfNull: true)
  final SubscriptionDto? subscription;

  @JsonKey(name: r'invoices', required: true, includeIfNull: false)
  final List<InvoiceSummaryDto> invoices;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BillingDto &&
          other.countryCode == countryCode &&
          other.currency == currency &&
          other.familyDiscountPercent == familyDiscountPercent &&
          other.trialDays == trialDays &&
          other.checkoutAvailable == checkoutAvailable &&
          other.plans == plans &&
          other.children == children &&
          other.subscription == subscription &&
          other.invoices == invoices;

  @override
  int get hashCode =>
      (countryCode == null ? 0 : countryCode.hashCode) +
      (currency == null ? 0 : currency.hashCode) +
      (familyDiscountPercent == null ? 0 : familyDiscountPercent.hashCode) +
      trialDays.hashCode +
      checkoutAvailable.hashCode +
      plans.hashCode +
      children.hashCode +
      (subscription == null ? 0 : subscription.hashCode) +
      invoices.hashCode;

  factory BillingDto.fromJson(Map<String, dynamic> json) =>
      _$BillingDtoFromJson(json);

  Map<String, dynamic> toJson() => _$BillingDtoToJson(this);

  @override
  String toString() {
    return toJson().toString();
  }
}
